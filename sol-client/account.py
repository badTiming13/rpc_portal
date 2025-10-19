import asyncio, struct
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.keypair import Keypair
from solders.instruction import Instruction, AccountMeta
from solders.message import MessageV0
from solders.transaction import VersionedTransaction
from solders.compute_budget import set_compute_unit_price

RPC = "https://api.devnet.solana.com"
PROGRAM_ID = Pubkey.from_string("JE9KDSz5B34CkxB5cEXxpSF6yRB3XzCEdL21xRBArzes")
SYS        = Pubkey.from_string("11111111111111111111111111111111")
LAMPORTS_PER_SOL = 1_000_000_000

# Admin must equal your on-chain ADMIN_PUBKEY
ADMIN = Keypair.from_base58_string(
    "5LXubbRc2CWbVktdXvSGoNB9YvqqkdLRFqzK7sytZ9gGH76PtJqvCBB9QjqXFYABREAr1E38mb797pV782cRjJS6"
)

# The user's wallet address (what you show as “Account for withdrawals”)
OWNER_STR = str(ADMIN.pubkey())  # for demo, withdraw to admin; replace with user-supplied address
OWNER = Pubkey.from_string(OWNER_STR)
print("OWNER: " , OWNER)

def user_pda_for(owner: Pubkey) -> Pubkey:
    pda, _bump = Pubkey.find_program_address([b"user", bytes(owner)], PROGRAM_ID)
    return pda

def pack_username_32(s: str) -> bytes:
    b = s.encode("utf-8")
    return b[:32] + b"\x00" * (32 - min(len(b), 32))

# ---------- instructions ----------

def ix_init_user(username: str) -> Instruction:
    """
    tag=2
    accounts = [payer(admin, signer+w), owner(readonly), user_pda(w), system]
    data = 1 + 32 + 8*3  (username[32], posts=0, likes_recv=0, likes_given=0)
    """
    user_pda = user_pda_for(OWNER)

    buf = bytearray(1 + 32 + 8*3)
    buf[0] = 2
    buf[1:33] = pack_username_32(username)
    struct.pack_into("<Q", buf, 33, 0)
    struct.pack_into("<Q", buf, 41, 0)
    struct.pack_into("<Q", buf, 49, 0)

    metas = [
        AccountMeta(ADMIN.pubkey(), True,  True),   # payer/admin
        AccountMeta(OWNER,          False, False),  # owner (seed)
        AccountMeta(user_pda,       False, True),   # user PDA
        AccountMeta(SYS,            False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_update_user(username: str, posts_created: int, likes_received: int, likes_given: int) -> Instruction:
    """
    tag=3
    accounts = [payer(admin, signer+w), owner(readonly), user_pda(w)]
    """
    user_pda = user_pda_for(OWNER)

    buf = bytearray(1 + 32 + 8*3)
    buf[0] = 3
    buf[1:33] = pack_username_32(username)
    struct.pack_into("<Q", buf, 33, posts_created)
    struct.pack_into("<Q", buf, 41, likes_received)
    struct.pack_into("<Q", buf, 49, likes_given)

    metas = [
        AccountMeta(ADMIN.pubkey(), True,  True),
        AccountMeta(OWNER,          False, False),
        AccountMeta(user_pda,       False, True),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_deposit(lamports: int) -> Instruction:
    user_pda = user_pda_for(OWNER)
    buf = bytearray(1 + 8)
    buf[0] = 4
    struct.pack_into("<Q", buf, 1, lamports)

    metas = [
        AccountMeta(ADMIN.pubkey(), True,  True),   # funder (here admin)
        AccountMeta(OWNER,          False, False),  # owner (seed)
        AccountMeta(user_pda,       False, True),   # dest: user PDA (w)
        AccountMeta(SYS,            False, False),
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

def ix_withdraw(lamports: int) -> Instruction:
    user_pda = user_pda_for(OWNER)
    buf = bytearray(1 + 8)
    buf[0] = 5  # tag
    struct.pack_into("<Q", buf, 1, lamports)

    metas = [
        AccountMeta(ADMIN.pubkey(), True,  True),  # admin signer
        AccountMeta(OWNER,          False, True),  # destination: writable (lamports change)
        AccountMeta(user_pda,       False, True),  # source PDA: writable
    ]
    return Instruction(PROGRAM_ID, bytes(buf), metas)

# ---------- helpers ----------

async def send(ixs: list[Instruction]) -> str:
    async with AsyncClient(RPC) as client:
        rb = await client.get_latest_blockhash()
        # Optional tip; value is micro-lamports per CU. Keep it tiny or 0 on devnet.
        fee = set_compute_unit_price(0)
        msg = MessageV0.try_compile(ADMIN.pubkey(), [fee, *ixs], [], rb.value.blockhash)
        tx  = VersionedTransaction(msg, [ADMIN])
        sig = await client.send_transaction(tx)
        return str(sig)

async def read_account(pubkey: Pubkey) -> bytes:
    async with AsyncClient(RPC) as client:
        resp = await client.get_account_info(pubkey, encoding="base64")
        assert resp.value is not None, f"account {pubkey} not found"
        data = resp.value.data  # solders returns raw bytes here on v3 RPC; if tuple, decode base64[0]
        if isinstance(data, tuple):  # (b64, 'base64')
            import base64
            data = base64.b64decode(data[0])
        return data

def parse_user(raw: bytes):
    name = raw[0:32].split(b"\x00", 1)[0].decode("utf-8", errors="ignore")
    posts_created = struct.unpack_from("<Q", raw, 32)[0]
    likes_received = struct.unpack_from("<Q", raw, 40)[0]
    likes_given    = struct.unpack_from("<Q", raw, 48)[0]
    return name, posts_created, likes_received, likes_given

# ---------- demo flow ----------

async def main():
    user_pda = user_pda_for(OWNER)
    print("OWNER:", OWNER)
    print("USER_PDA:", user_pda)

    # # 1) Try init user (will fail if already exists; comment out after first run)
    # try:
    #     sig = await send([ix_init_user("FLOCK4H")])
    #     print("init_user:", sig)
    #     await asyncio.sleep(3)
    # except Exception as e:
    #     print("init_user skipped / already exists:", e)

    # # 2) Update after 5s
    # await asyncio.sleep(5)
    # sig = await send([ix_update_user("FLOCK4H", posts_created=1, likes_received=2, likes_given=3)])
    # print("update_user:", sig)

    # 3) Deposit 0.1 SOL
    amount = int(0.1 * LAMPORTS_PER_SOL)  # 100_000_000 lamports
    # sig = await send([ix_deposit(amount)])
    # print("deposit 0.1 SOL:", sig)

    # # 4) Withdraw after 10s (admin -> owner)
    # await asyncio.sleep(10)
    sig = await send([ix_withdraw(amount // 2)])  # withdraw half for demo
    print("withdraw 0.05 SOL:", sig)

    # 5) Read back user bytes (struct-only; lamports live on the account, not in the struct)
    try:
        raw = await read_account(user_pda)
        print("USER struct:", parse_user(raw))
    except Exception as e:
        print("read user struct failed:", e)

if __name__ == "__main__":
    asyncio.run(main())