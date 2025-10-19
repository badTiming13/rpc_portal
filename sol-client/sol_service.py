import time, struct, base64
from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import MessageV0
from solders.transaction import VersionedTransaction
from solders.signature import Signature
from solders.compute_budget import set_compute_unit_price

# --------- CONFIG ---------
RPC = "https://api.devnet.solana.com"
PROGRAM_ID = Pubkey.from_string("JE9KDSz5B34CkxB5cEXxpSF6yRB3XzCEdL21xRBArzes")  # Hardcoded Program ID
ADMIN = Keypair.from_base58_string(
    "5LXubbRc2CWbVktdXvSGoNB9YvqqkdLRFqzK7sytZ9gGH76PtJqvCBB9QjqXFYABREAr1E38mb797pV782cRjJS6"
)  # Hardcoded ADMIN Keypair
SYS = Pubkey.from_string("11111111111111111111111111111111")
MEMO = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
LAMPORTS_PER_SOL = 1_000_000_000

# --------- APP ---------
app = FastAPI()
client: Optional[AsyncClient] = None

# --------- UTILS ---------
def user_pda_for(owner: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address([b"user", bytes(owner)], PROGRAM_ID)
    return pda

def pack_username_32(s: str) -> bytes:
    b = s.encode("utf-8")
    return b[:32] + b"\x00" * (32 - min(len(b), 32))

def ix_init_user(owner: Pubkey, username: str) -> Instruction:
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 32 + 8 * 3)
    buf[0] = 2
    buf[1:33] = pack_username_32(username)
    for off in (33, 41, 49):
        struct.pack_into("<Q", buf, off, 0)
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, False),
        AccountMeta(user_pda, False, True),
        AccountMeta(SYS, False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_update_user(owner: Pubkey, username: str, posts: int, likes_recv: int, likes_given: int) -> Instruction:
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 32 + 8 * 3)
    buf[0] = 3
    buf[1:33] = pack_username_32(username)
    struct.pack_into("<Q", buf, 33, posts)
    struct.pack_into("<Q", buf, 41, likes_recv)
    struct.pack_into("<Q", buf, 49, likes_given)
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, False),
        AccountMeta(user_pda, False, True),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_deposit(owner: Pubkey, lamports: int) -> Instruction:
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 8)
    buf[0] = 4
    struct.pack_into("<Q", buf, 1, lamports)
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, False),
        AccountMeta(user_pda, False, True),
        AccountMeta(SYS, False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_withdraw(owner: Pubkey, lamports: int) -> Instruction:
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 8)
    buf[0] = 5
    struct.pack_into("<Q", buf, 1, lamports)
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, True),
        AccountMeta(user_pda, False, True),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def pack_post_ix(owner: Pubkey, *, is_head: bool, chunk_id: int, chunk_total: int, content: bytes) -> Instruction:
    """
    tag=6
    data = [u8 tag | owner 32 | u8 is_head | u16 chunk_id | u16 chunk_total | u16 len | bytes]
    accounts = [admin signer, owner readonly, user_pda writable, memo_program readonly]
    """
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 32 + 1 + 2 + 2 + 2 + len(content))
    buf[0] = 6
    buf[1:33] = bytes(owner)
    buf[33] = 1 if is_head else 0
    struct.pack_into("<H", buf, 34, chunk_id)
    struct.pack_into("<H", buf, 36, chunk_total)
    struct.pack_into("<H", buf, 38, len(content))
    if content:
        buf[40:40 + len(content)] = content
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, False),
        AccountMeta(user_pda, False, True),
        AccountMeta(MEMO, False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def pack_like_ix(post_owner: Pubkey, post_seq: int, liker: Pubkey) -> Instruction:
    """
    tag=7
    data = [u8 tag | post_owner(32) | post_seq u64 | liker(32) | ts u64]
    accounts = [
        admin signer,
        liker (ro), liker_user_pda (w),
        post_owner (ro), post_owner_user_pda (w),
    ]
    """
    buf = bytearray(1 + 32 + 8 + 32 + 8)
    buf[0] = 7
    buf[1:33] = bytes(post_owner)
    struct.pack_into("<Q", buf, 33, post_seq)
    buf[41:73] = bytes(liker)
    struct.pack_into("<Q", buf, 73, int(time.time()))
    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(liker, False, False),
        AccountMeta(user_pda_for(liker), False, True),
        AccountMeta(post_owner, False, False),
        AccountMeta(user_pda_for(post_owner), False, True),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

async def send(ixs: list[Instruction]) -> str:
    rb = await client.get_latest_blockhash()
    fee = set_compute_unit_price(0)  # keep tiny/zero on devnet
    msg = MessageV0.try_compile(ADMIN.pubkey(), [fee, *ixs], [], rb.value.blockhash)
    tx = VersionedTransaction(msg, [ADMIN])
    resp = await client.send_transaction(tx)
    return str(getattr(resp, "value", resp))

async def get_user_bytes(owner: Pubkey) -> Optional[bytes]:
    pda = user_pda_for(owner)
    r = await client.get_account_info(pda, encoding="base64")
    if r.value is None:
        return None
    data = r.value.data
    if isinstance(data, tuple):  # (b64, 'base64')
        data = base64.b64decode(data[0])
    return data

def parse_user(raw: bytes):
    name = raw[0:32].split(b"\x00", 1)[0].decode("utf-8", errors="ignore")
    posts_created = struct.unpack_from("<Q", raw, 32)[0]
    likes_received = struct.unpack_from("<Q", raw, 40)[0]
    likes_given = struct.unpack_from("<Q", raw, 48)[0]
    return {
        "username": name,
        "posts_created": posts_created,
        "likes_received": likes_received,
        "likes_given": likes_given,
    }

# --------- LIFECYCLE ---------
@app.on_event("startup")
async def startup():
    global client
    client = AsyncClient(RPC)

@app.on_event("shutdown")
async def shutdown():
    await client.close()

# --------- SCHEMAS ---------
class InitUserReq(BaseModel):
    owner: str
    username: str = Field(max_length=32)

class PostReq(BaseModel):
    owner: str
    text: str = Field(max_length=5000)

class LikeReq(BaseModel):
    post_owner: str
    post_seq: int
    liker: str

# --------- ENDPOINTS ---------
@app.get("/")
async def root():
    return {
        "ok": True,
        "service": "solapi",
        "endpoints": [
            "/init-user",
            "/post",
            "/like",
            "/read-post/{sig}",
            "/read-user/{owner}",
        ],
    }

@app.post("/init-user")
async def init_user(req: InitUserReq):
    owner = Pubkey.from_string(req.owner)
    ix = ix_init_user(owner, req.username)
    sig = await send([ix])

    # --- Wait until the PDA is readable (up to ~6s) ---
    deadline = time.time() + 6.0
    last_err = None
    while time.time() < deadline:
        try:
            raw = await get_user_bytes(owner)
            if raw is not None:
                return {"ok": True, "sig": sig}
        except Exception as e:
            last_err = e
        await asyncio.sleep(0.4)

    # Not fatal, but report we didn't see it yet.
    raise HTTPException(status_code=202, detail={"ok": True, "sig": sig, "note": "user_pda_not_visible_yet"})

@app.post("/post")
async def post_text(req: PostReq):
    owner = Pubkey.from_string(req.owner)

    # --- Require the user PDA to exist to avoid on-chain panic
    raw = await get_user_bytes(owner)
    if raw is None:
        raise HTTPException(status_code=400, detail="user_not_found: call /init-user first")

    # Predict seq for display (prev + 1)
    prev = struct.unpack_from("<Q", raw, 32)[0]
    predicted_seq = prev + 1

    # Build chunks
    data = req.text.encode("utf-8")
    parts = [data[i: i + 700] for i in range(0, len(data), 700)] or [b""]

    ixs: list[Instruction] = []
    for i, part in enumerate(parts, start=1):
        ixs.append(
            pack_post_ix(
                owner,
                is_head=(i == 1),        # HEAD = first chunk (1-based)
                chunk_id=i,
                chunk_total=len(parts),
                content=part,
            )
        )

    # ---- Defensive checks & compact debug ----
    if not ixs:
        raise HTTPException(400, "no instructions built")
    bad = [len(ix.data) for ix in ixs if len(ix.data) < 40]  # header is 40 bytes
    if bad:
        raise HTTPException(400, f"bad instruction data lengths: {bad}")

    ix0 = ixs[0]
    try:
        print(
            "POST ix0",
            "len=", len(ix0.data),
            "tag=", ix0.data[0] if len(ix0.data) else None,
            "is_head=", ix0.data[33] if len(ix0.data) >= 34 else None,
            "chunk_id=", int.from_bytes(ix0.data[34:36], "little") if len(ix0.data) >= 36 else None,
            "chunk_total=", int.from_bytes(ix0.data[36:38], "little") if len(ix0.data) >= 38 else None,
            "len_field=", int.from_bytes(ix0.data[38:40], "little") if len(ix0.data) >= 40 else None,
        )
    except Exception:
        pass
    # ------------------------------------------

    sig = await send(ixs)
    return {"ok": True, "sig": sig, "post_id": [req.owner, predicted_seq]}

@app.post("/like")
async def like(req: LikeReq):
    post_owner = Pubkey.from_string(req.post_owner)
    liker = Pubkey.from_string(req.liker)

    # --- Require both user PDAs to exist to avoid on-chain panic
    if await get_user_bytes(liker) is None:
        raise HTTPException(status_code=400, detail="liker_user_not_found: call /init-user first")
    if await get_user_bytes(post_owner) is None:
        raise HTTPException(status_code=400, detail="post_owner_user_not_found")

    ix = pack_like_ix(post_owner, req.post_seq, liker)
    sig = await send([ix])
    return {"ok": True, "sig": sig}

@app.get("/read-post/{sig}")
async def read_post(sig: str):
    r = await client.get_transaction(tx_sig=Signature.from_string(sig), max_supported_transaction_version=0)
    if r.value is None:
        raise HTTPException(404, "tx not found")

    logs = r.value.transaction.meta.log_messages or []

    def parse(line: str):
        if "Memo" not in line:
            return None
        q = line.find('"')
        payload = line[q + 1: line.find('"', q + 1)]
        parts = payload.split("|")
        if len(parts) != 7 or parts[0] != "F4HPOST" or parts[1] != "1":
            return None
        try:
            cid = int(parts[4])
            tot = int(parts[5])
            chunk = bytes.fromhex(parts[6])
        except Exception:
            return None
        return (cid, tot, chunk)

    chunks = []
    ctot = None
    for line in logs:
        p = parse(line)
        if not p:
            continue
        cid, tot, chunk = p
        chunks.append((cid, chunk))
        ctot = tot

    if not chunks:
        raise HTTPException(404, "no F4HPOST memo found")

    chunks.sort(key=lambda x: x[0])
    content = b"".join(c for _, c in chunks)
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.hex()

    return {"ok": True, "chunks": len(chunks), "chunk_total": ctot, "text": text}

@app.get("/read-user/{owner_b58}")
async def read_user(owner_b58: str):
    raw = await get_user_bytes(Pubkey.from_string(owner_b58))
    if not raw:
        raise HTTPException(404, "user_not_found")
    return {"ok": True, "user": parse_user(raw)}
