import asyncio, struct, base64
import time
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import MessageV0
from solders.transaction import VersionedTransaction
from solders.signature import Signature

RPC = "https://api.devnet.solana.com"
PROGRAM_ID = Pubkey.from_string("JE9KDSz5B34CkxB5cEXxpSF6yRB3XzCEdL21xRBArzes")

# Admin must equal your on-chain ADMIN_PUBKEY
ADMIN = Keypair.from_base58_string("5LXubbRc2CWbVktdXvSGoNB9YvqqkdLRFqzK7sytZ9gGH76PtJqvCBB9QjqXFYABREAr1E38mb797pV782cRjJS6")

def user_pda_for(owner: Pubkey) -> Pubkey:
    pda, _ = Pubkey.find_program_address([b"user", bytes(owner)], PROGRAM_ID)
    return pda

MEMO = Pubkey.from_string("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")  # add this

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
    buf[40:40+len(content)] = content
    metas = [
        AccountMeta(ADMIN.pubkey(), True,  True),   # admin signer
        AccountMeta(owner,          False, False),  # owner (seed echo)
        AccountMeta(user_pda,       False, True),   # user PDA
        AccountMeta(MEMO,           False, False),  # <-- ADD Memo program account
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
        AccountMeta(ADMIN.pubkey(),            True,  True),
        AccountMeta(liker,                     False, False),
        AccountMeta(user_pda_for(liker),       False, True),
        AccountMeta(post_owner,                False, False),
        AccountMeta(user_pda_for(post_owner),  False, True),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

async def get_user_bytes(owner: Pubkey) -> bytes | None:
    pda = user_pda_for(owner)
    async with AsyncClient(RPC) as c:
        r = await c.get_account_info(pda, encoding="base64")
        if r.value is None:
            return None
        data = r.value.data
        if isinstance(data, tuple):  # (b64, 'base64')
            data = base64.b64decode(data[0])
        return data

def parse_user(raw: bytes):
    # username[32] | posts_created u64 | likes_received u64 | likes_given u64
    posts_created = struct.unpack_from("<Q", raw, 32)[0]
    return posts_created

async def send(ixs: list[Instruction]) -> str:
    async with AsyncClient(RPC) as c:
        rb = await c.get_latest_blockhash()
        msg = MessageV0.try_compile(ADMIN.pubkey(), ixs, [], rb.value.blockhash)
        tx  = VersionedTransaction(msg, [ADMIN])
        sig = await c.send_transaction(tx)
        return str(sig.value)

async def read_post(signature: str) -> str:
    def parse_memo_line(line: str):
        # line looks like: "Program log: Memo: F4HPOST|1|<owner>|<seq>|<chunk_id>|<chunk_total>|<hex>"
        if "Memo" not in line:
            return None
        payload = line.find("\"")
        payload = line[payload + 1:line.find("\"", payload + 1)]
        parts = payload.split("|")
        if len(parts) != 7 or parts[0] != "F4HPOST" or parts[1] != "1":
            return None
        owner_b58 = parts[2]
        seq       = int(parts[3])
        chunk_id  = int(parts[4])
        chunk_tot = int(parts[5])
        hexdata   = parts[6]
        try:
            chunk = bytes.fromhex(hexdata)
        except ValueError:
            return None
        return (owner_b58, seq, chunk_id, chunk_tot, chunk)

    async with AsyncClient(RPC) as c:
        print(f"reading post {signature}")
        resp = await c.get_transaction(tx_sig=Signature.from_string(signature), max_supported_transaction_version=0)
        assert resp.value is not None, f"transaction {signature} not found"

        # get logs (works for both Solders and dict)
        logs = None
        logs = resp.value.transaction.meta.log_messages
        assert logs is not None, "no log messages available on transaction"

        chunks = []
        meta = None
        print(f"logs: {logs}")
        for line in logs:
            parsed = parse_memo_line(line)
            if not parsed:
                continue
            owner_b58, seq, cid, ctot, chunk = parsed
            chunks.append((cid, chunk))
            meta = (owner_b58, seq, ctot)

        assert meta is not None, "no F4HPOST memo found"
        owner_b58, seq, ctot = meta
        chunks.sort(key=lambda x: x[0])  # ensure order by chunk id
        content = b"".join(c for _, c in chunks)
        try:
            text = content.decode("utf-8")
        except UnicodeDecodeError:
            # fallback to show hex if not UTF-8
            text = content.hex()
        print(f"post_id=({owner_b58}, {seq}) chunks={len(chunks)}/{ctot}")
        return text

async def post_text(owner: Pubkey, text: str, chunk_size: int = 700) -> str:
    # 1) Predict post_id seq for display (prev + 1)
    prev_posts = 0
    raw = await get_user_bytes(owner)
    if raw:
        prev_posts = parse_user(raw)
    predicted_seq = prev_posts + 1

    # 2) Chunk the content and build post instructions (head first)
    data = text.encode("utf-8")
    parts = [data[i:i+chunk_size] for i in range(0, len(data), chunk_size)] or [b""]
    ixs = []
    for i, part in enumerate(parts, start=1):
        ixs.append(pack_post_ix(
            owner,
            is_head=(i == 0),
            chunk_id=i,
            chunk_total=len(parts),
            content=part
        ))

    # 3) Send in one tx (so seq is consistent across chunks)
    sig = await send(ixs)
    print("tx:", sig)
    print("post_id:", f"({owner}, {predicted_seq})  # (owner_pubkey, seq)")
    return sig

async def like_post(post_owner: Pubkey, post_seq: int, liker: Pubkey) -> str:
    sig = await send([pack_like_ix(post_owner, post_seq, liker)])
    print("tx:", sig)
    return sig

# --- demo ---
if __name__ == "__main__":
    async def main():
        # For demo we “post as” the admin-owned user record. Replace with any end-user wallet you seeded.
        owner = ADMIN.pubkey()
        sig = await like_post(owner, 1, ADMIN.pubkey())
        print("like_post:", sig)
        # text = "GM Solana! This post goes into SPL Memo via CPI, with a deterministic post_id."
        # sig = await post_text(owner, text)
        # await asyncio.sleep(20)
        # try:
        #     content = await read_post(str(sig))
        #     print("read_post:", content)
        # except Exception as e:
        #     print("read_post failed:", e)

    asyncio.run(main())