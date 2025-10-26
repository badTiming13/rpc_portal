import asyncio
import time, struct, base64
from typing import Optional, List, Tuple
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

import httpx
from solana.exceptions import SolanaRpcException
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import MessageV0
from solders.transaction import VersionedTransaction
from solders.signature import Signature
from solders.compute_budget import (
    set_compute_unit_price,
    set_compute_unit_limit,
)

# --------- CONFIG ---------
RPC = "https://api.devnet.solana.com"

PROGRAM_ID = Pubkey.from_string(
    "JE9KDSz5B34CkxB5cEXxpSF6yRB3XzCEdL21xRBArzes"
)

ADMIN = Keypair.from_base58_string(
    "5LXubbRc2CWbVktdXvSGoNB9YvqqkdLRFqzK7sytZ9gGH76PtJqvCBB9QjqXFYABREAr1E38mb797pV782cRjJS6"
)

SYS = Pubkey.from_string("11111111111111111111111111111111")
MEMO = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

LAMPORTS_PER_SOL = 1_000_000_000

# --------- APP ---------
app = FastAPI()
client: Optional[AsyncClient] = None


# --------- UTILS ---------
def user_pda_for(owner: Pubkey) -> Pubkey:
    """
    Derive the per-user PDA for our program:
    seeds = ["user", owner].
    """
    pda, _ = Pubkey.find_program_address([b"user", bytes(owner)], PROGRAM_ID)
    return pda


def pack_username_32(s: str) -> bytes:
    """
    Program stores username as fixed 32 bytes (null padded).
    """
    b = s.encode("utf-8")
    return b[:32] + b"\x00" * (32 - min(len(b), 32))


def ix_init_user(owner: Pubkey, username: str) -> Instruction:
    """
    tag = 2
    data = [u8 tag | username[32] | posts u64 | likes_recv u64 | likes_given u64]
    accounts = [admin signer, owner ro, user_pda rw, system_program ro]
    """
    user_pda = user_pda_for(owner)
    buf = bytearray(1 + 32 + 8 * 3)
    buf[0] = 2
    buf[1:33] = pack_username_32(username)
    # start stats at zero
    for off in (33, 41, 49):
        struct.pack_into("<Q", buf, off, 0)

    metas = [
        AccountMeta(ADMIN.pubkey(), True, True),
        AccountMeta(owner, False, False),
        AccountMeta(user_pda, False, True),
        AccountMeta(SYS, False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)


def ix_update_user(
    owner: Pubkey,
    username: str,
    posts: int,
    likes_recv: int,
    likes_given: int,
) -> Instruction:
    """
    tag = 3
    data = [u8 tag | username[32] | posts u64 | likes_recv u64 | likes_given u64]
    accounts = [admin signer, owner ro, user_pda rw]
    """
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
    """
    tag = 4
    data = [u8 tag | lamports u64]
    accounts = [admin signer, owner ro, user_pda rw, system_program ro]
    """
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
    """
    tag = 5
    data = [u8 tag | lamports u64]
    accounts = [admin signer, owner rw, user_pda rw]
    """
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


def pack_post_ix(
    owner: Pubkey,
    *,
    is_head: bool,
    chunk_id: int,
    chunk_total: int,
    content: bytes,
) -> Instruction:
    """
    tag=6
    data = [
        u8 tag,
        owner[32],
        u8 is_head,
        u16 chunk_id,
        u16 chunk_total,
        u16 content_len,
        content_bytes...
    ]

    accounts = [
        admin signer,
        owner readonly,
        user_pda writable,
        memo_program readonly
    ]
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
        buf[40 : 40 + len(content)] = content

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


async def send(ixs: List[Instruction]) -> str:
    """
    Build and send a single tx including compute budget tweaks.
    """
    rb = await client.get_latest_blockhash()

    # ask for higher compute limit + tip 0
    cu_limit_ix = set_compute_unit_limit(400_000)
    cu_price_ix = set_compute_unit_price(0)

    msg = MessageV0.try_compile(
        ADMIN.pubkey(),
        [cu_limit_ix, cu_price_ix, *ixs],
        [],
        rb.value.blockhash,
    )
    tx = VersionedTransaction(msg, [ADMIN])
    resp = await client.send_transaction(tx)
    return str(getattr(resp, "value", resp))


async def get_user_account_info(owner: Pubkey) -> Tuple[Optional[bytes], int]:
    """
    Return (raw_user_bytes, lamports) for the user's PDA.
    If PDA doesn't exist, (None, 0).
    """
    pda = user_pda_for(owner)
    r = await client.get_account_info(pda, encoding="base64")
    if r.value is None:
        return None, 0

    acc = r.value

    # PDA lamports (balance in lamports)
    lamports = acc.lamports

    # Account data may come as a tuple (b64, 'base64').
    data = acc.data
    if isinstance(data, tuple):
        data = base64.b64decode(data[0])

    return data, lamports


async def get_user_bytes(owner: Pubkey) -> Optional[bytes]:
    """
    Legacy helper: just return PDA data bytes (or None).
    We keep it because other code calls it.
    """
    raw, _lamports = await get_user_account_info(owner)
    return raw


def lamports_to_sol(lamports: int) -> float:
    return lamports / LAMPORTS_PER_SOL


def parse_user(raw: bytes):
    """
    Our user struct layout in the PDA:
    [0..32)   username padded with 0x00
    [32..40)  posts_created u64
    [40..48)  likes_received u64
    [48..56)  likes_given u64
    """
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
    client = AsyncClient(RPC, timeout=30.0)


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


class DepositReq(BaseModel):
    """
    Deposit SOL *from* the wallet into the PDA.
    amount_sol is human SOL (e.g. 0.1)
    """
    owner: str
    amount_sol: float = Field(gt=0)


class WithdrawReq(BaseModel):
    """
    Withdraw SOL *from* the PDA back to the wallet.
    """
    owner: str
    amount_sol: float = Field(gt=0)


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
            "/deposit",
            "/withdraw",
            "/read-post/{sig}",
            "/read-user/{owner_b58}",
        ],
    }


@app.post("/init-user")
async def init_user(req: InitUserReq):
    owner = Pubkey.from_string(req.owner)
    ix = ix_init_user(owner, req.username)
    sig = await send([ix])

    # poll for PDA to appear (devnet can lag)
    deadline = time.time() + 6.0
    while time.time() < deadline:
        raw, _lamports = await get_user_account_info(owner)
        if raw is not None:
            return {"ok": True, "sig": sig}
        await asyncio.sleep(0.4)

    # PDA didn't become visible fast enough, still return partial
    raise HTTPException(
        status_code=202,
        detail={"ok": True, "sig": sig, "note": "user_pda_not_visible_yet"},
    )


@app.post("/post")
async def post_text(req: PostReq):
    """
    Create a post as multiple chunks.
    We bump compute budget for each chunk tx.
    """
    owner = Pubkey.from_string(req.owner)

    raw_user = await get_user_bytes(owner)
    if raw_user is None:
        raise HTTPException(
            status_code=400,
            detail="user_not_found: call /init-user first",
        )

    prev = struct.unpack_from("<Q", raw_user, 32)[0]
    predicted_seq = prev + 1

    full_bytes = req.text.encode("utf-8")

    # naive memo-chunking
    CHUNK_SIZE = 200
    parts = [
        full_bytes[i : i + CHUNK_SIZE]
        for i in range(0, len(full_bytes), CHUNK_SIZE)
    ] or [b""]
    total_parts = len(parts)

    tx_sigs: List[str] = []
    returned_chunks = []

    for idx, part in enumerate(parts, start=1):
        ix = pack_post_ix(
            owner,
            is_head=(idx == 1),
            chunk_id=idx,
            chunk_total=total_parts,
            content=part,
        )

        # debug info so we can inspect memo packing
        try:
            print(
                "POST chunk",
                "idx=", idx,
                "chunk_bytes=", len(part),
                "ix_data_len=", len(ix.data),
                "is_head=", ix.data[33] if len(ix.data) >= 34 else None,
                "chunk_id=", int.from_bytes(ix.data[34:36], "little")
                if len(ix.data) >= 36
                else None,
                "chunk_total=", int.from_bytes(ix.data[36:38], "little")
                if len(ix.data) >= 38
                else None,
                "len_field=", int.from_bytes(ix.data[38:40], "little")
                if len(ix.data) >= 40
                else None,
            )
        except Exception:
            pass

        sig = await send([ix])
        tx_sigs.append(sig)

        returned_chunks.append(
            {
                "index": idx,
                "total": total_parts,
                "tx_signature": sig,
                "content_utf8": part.decode("utf-8", errors="replace"),
            }
        )

    root_sig = tx_sigs[0]

    return {
        "ok": True,
        "owner": str(owner),
        "seq": predicted_seq,
        "root_sig": root_sig,
        "tx_sigs": tx_sigs,
        "chunks": returned_chunks,
    }


@app.post("/like")
async def like(req: LikeReq):
    post_owner = Pubkey.from_string(req.post_owner)
    liker = Pubkey.from_string(req.liker)

    # both sides must already have PDA accounts
    if await get_user_bytes(liker) is None:
        raise HTTPException(
            status_code=400,
            detail="liker_user_not_found: call /init-user first",
        )
    if await get_user_bytes(post_owner) is None:
        raise HTTPException(
            status_code=400,
            detail="post_owner_user_not_found",
        )

    ix = pack_like_ix(post_owner, req.post_seq, liker)
    sig = await send([ix])
    return {"ok": True, "sig": sig}


@app.post("/deposit")
async def deposit(req: DepositReq):
    """
    Move SOL from the user's wallet into their program PDA.
    amount_sol -> lamports, then we build ix_deposit.
    """
    owner = Pubkey.from_string(req.owner)

    # user must already exist on-chain
    if await get_user_bytes(owner) is None:
        raise HTTPException(
            status_code=400,
            detail="user_not_found: call /init-user first",
        )

    lamports = int(req.amount_sol * LAMPORTS_PER_SOL)

    ix = ix_deposit(owner, lamports)
    sig = await send([ix])
    return {
        "ok": True,
        "sig": sig,
        "lamports": lamports,
        "amount_sol": req.amount_sol,
    }


@app.post("/withdraw")
async def withdraw(req: WithdrawReq):
    """
    Move SOL from the user's PDA back to their wallet.
    """
    owner = Pubkey.from_string(req.owner)

    if await get_user_bytes(owner) is None:
        raise HTTPException(
            status_code=400,
            detail="user_not_found: call /init-user first",
        )

    lamports = int(req.amount_sol * LAMPORTS_PER_SOL)

    ix = ix_withdraw(owner, lamports)
    sig = await send([ix])
    return {
        "ok": True,
        "sig": sig,
        "lamports": lamports,
        "amount_sol": req.amount_sol,
    }


@app.get("/read-post/{sig}")
async def read_post(sig: str):
    """
    Reassemble a post by reading all Memo logs from the tx.
    We assume each chunk was emitted by Memo as "F4HPOST|1|...."
    """
    try:
        r = await client.get_transaction(
            tx_sig=Signature.from_string(sig),
            max_supported_transaction_version=0,
        )
    except (httpx.ReadTimeout, SolanaRpcException):
        raise HTTPException(404, "tx not available yet")

    if r.value is None:
        raise HTTPException(404, "tx not found")

    logs = r.value.transaction.meta.log_messages or []

    def parse(line: str):
        if "Memo" not in line:
            return None
        q = line.find('"')
        payload = line[q + 1 : line.find('"', q + 1)]
        parts_local = payload.split("|")
        if (
            len(parts_local) != 7
            or parts_local[0] != "F4HPOST"
            or parts_local[1] != "1"
        ):
            return None
        try:
            cid = int(parts_local[4])
            tot = int(parts_local[5])
            chunk = bytes.fromhex(parts_local[6])
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

    return {
        "ok": True,
        "chunks": len(chunks),
        "chunk_total": ctot,
        "text": text,
    }


@app.get("/read-user/{owner_b58}")
async def read_user(owner_b58: str):
    """
    Return user's on-chain profile data + PDA balance.
    balance_sol = PDA lamports / LAMPORTS_PER_SOL
    """
    owner = Pubkey.from_string(owner_b58)

    raw_bytes, lamports = await get_user_account_info(owner)
    if not raw_bytes:
        raise HTTPException(404, "user_not_found")

    user_struct = parse_user(raw_bytes)

    return {
        "ok": True,
        "user": {
            **user_struct,
            "balance_sol": lamports_to_sol(lamports),
        },
    }
