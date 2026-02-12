"""
CampusBazaar - Algorand Testnet Deployment & Demo Script

Usage:
  python deploy_and_test.py

Requirements:
  pip install algosdk pyteal python-dotenv
"""

import os
import json
import time
import base64
import os
import sys

# Always resolve paths relative to THIS script's location, not where you run from
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT_DIR)
from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod
from algosdk.encoding import decode_address

# ─── Configuration ────────────────────────────────────────────────────────────

ALGOD_ADDRESS = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN   = ""
client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)

# ─── Helpers ──────────────────────────────────────────────────────────────────

def generate_account():
    """Generate a new Algorand account."""
    private_key, address = account.generate_account()
    return {
        "private_key": private_key,
        "address":     address,
        "mnemonic":    mnemonic.from_private_key(private_key),
    }


def wait_for_confirmation(txid: str, timeout: int = 15) -> dict:
    params = client.suggested_params()
    start  = params.first
    current = start
    while current < start + timeout:
        try:
            pending = client.pending_transaction_info(txid)
            if pending.get("confirmed-round", 0) > 0:
                return pending
            if pending.get("pool-error"):
                raise Exception(f"Pool error: {pending['pool-error']}")
        except Exception as e:
            if "not found" not in str(e).lower():
                raise
        status = client.status()
        current = status["last-round"]
        time.sleep(1)
    raise Exception(f"Transaction {txid} not confirmed after {timeout} rounds")


def fund_from_dispenser(address: str):
    """
    Fund account from Algorand testnet dispenser.
    Visit: https://bank.testnet.algorand.network/?account=<ADDRESS>
    """
    dispenser_url = f"https://bank.testnet.algorand.network/?account={address}"
    print(f"\n💧 Fund this address using the Algorand testnet dispenser:")
    print(f"   {dispenser_url}")
    print(f"   Address: {address}")
    input("\n   Press Enter after funding...")


def compile_teal(source: str) -> bytes:
    result = client.compile(source)
    return base64.b64decode(result["result"])


def get_params():
    params = client.suggested_params()
    params.fee = 1000
    params.flat_fee = True
    return params


# ─── Smart Contract Deployment ────────────────────────────────────────────────

def deploy_ecopoints_contract(admin_private_key: str, admin_address: str) -> int:
    """Deploy the EcoPoints reputation contract. Returns app_id."""
    print("\n📦 Deploying EcoPoints contract...")

    try:
        with open("smart_contracts/build/ecopoints_approval.teal") as f:
            approval_src = f.read()
        with open("smart_contracts/build/ecopoints_clear.teal") as f:
            clear_src = f.read()
    except FileNotFoundError:
        print("   TEAL files not found. Compiling from PyTeal...")
        import subprocess
        subprocess.run([sys.executable, os.path.join(ROOT_DIR, "smart_contracts", "ecopoints_reputation.py")], check=True)
        with open("smart_contracts/build/ecopoints_approval.teal") as f:
            approval_src = f.read()
        with open("smart_contracts/build/ecopoints_clear.teal") as f:
            clear_src = f.read()

    approval_bytes = compile_teal(approval_src)
    clear_bytes    = compile_teal(clear_src)

    # 8 bytes + 6 uints (local), 2 bytes + 3 uints (global)
    global_schema = transaction.StateSchema(num_uints=3, num_byte_slices=2)
    local_schema  = transaction.StateSchema(num_uints=6, num_byte_slices=2)

    txn = transaction.ApplicationCreateTxn(
        sender=admin_address,
        sp=get_params(),
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[decode_address(admin_address)],
    )

    signed = txn.sign(admin_private_key)
    txid   = client.send_transaction(signed)
    print(f"   TxID: {txid}")
    confirmed = wait_for_confirmation(txid)
    app_id = confirmed["application-index"]
    print(f"   ✅ EcoPoints contract deployed → App ID: {app_id}")
    return app_id


def deploy_listing_escrow(
    seller_private_key: str,
    seller_address: str,
    title: str,
    price_microalgo: int,
    category: str,
    co2_saved: int,
    eco_points: int,
    platform_fee_address: str,
) -> dict:
    """Deploy marketplace escrow for one listing. Returns app_id + address."""
    print(f"\n📦 Deploying escrow for listing: '{title}'")

    try:
        with open("smart_contracts/build/approval.teal") as f:
            approval_src = f.read()
        with open("smart_contracts/build/clear.teal") as f:
            clear_src = f.read()
    except FileNotFoundError:
        import subprocess
        subprocess.run(["python", "smart_contracts/marketplace_escrow.py"], check=True)
        with open("smart_contracts/build/approval.teal") as f:
            approval_src = f.read()
        with open("smart_contracts/build/clear.teal") as f:
            clear_src = f.read()

    approval_bytes = compile_teal(approval_src)
    clear_bytes    = compile_teal(clear_src)

    global_schema = transaction.StateSchema(num_uints=3, num_byte_slices=8)
    local_schema  = transaction.StateSchema(num_uints=0, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=seller_address,
        sp=get_params(),
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[
            title.encode()[:64],
            price_microalgo.to_bytes(8, "big"),
            category.encode(),
            co2_saved.to_bytes(8, "big"),
            eco_points.to_bytes(8, "big"),
            decode_address(platform_fee_address),
        ],
    )

    signed = txn.sign(seller_private_key)
    txid   = client.send_transaction(signed)
    print(f"   TxID: {txid}")
    confirmed = wait_for_confirmation(txid)
    app_id = confirmed["application-index"]

    app_address = transaction.logic.get_application_address(app_id)
    print(f"   ✅ Escrow deployed → App ID: {app_id}, Address: {app_address}")

    # Fund the escrow with minimum balance (0.1 ALGO)
    fund_txn = transaction.PaymentTxn(
        sender=seller_address,
        sp=get_params(),
        receiver=app_address,
        amt=200_000,  # 0.2 ALGO for inner txns
    )
    signed_fund = fund_txn.sign(seller_private_key)
    algod_client_id = client.send_transaction(signed_fund)
    wait_for_confirmation(algod_client_id)
    print(f"   ✅ Escrow funded with 0.2 ALGO for inner transactions")

    return {"app_id": app_id, "app_address": app_address}


def buyer_fund_escrow(
    buyer_private_key: str,
    buyer_address: str,
    app_id: int,
    app_address: str,
    price_microalgo: int,
) -> str:
    """Buyer funds the escrow. Returns txid."""
    print(f"\n💸 Buyer funding escrow (App {app_id})...")
    params = get_params()

    app_call_txn = transaction.ApplicationNoOpTxn(
        sender=buyer_address,
        sp=params,
        index=app_id,
        app_args=[b"fund_escrow"],
    )

    payment_txn = transaction.PaymentTxn(
        sender=buyer_address,
        sp=params,
        receiver=app_address,
        amt=price_microalgo,
    )

    gid = transaction.calculate_group_id([app_call_txn, payment_txn])
    app_call_txn.group = gid
    payment_txn.group  = gid

    signed_call = app_call_txn.sign(buyer_private_key)
    signed_pay  = payment_txn.sign(buyer_private_key)

    txid = client.send_transactions([signed_call, signed_pay])
    wait_for_confirmation(txid)
    print(f"   ✅ Escrow funded by buyer! TxID: {txid}")
    return txid


def buyer_confirm_delivery(
    buyer_private_key: str,
    buyer_address: str,
    app_id: int,
) -> str:
    """Buyer confirms delivery, funds released to seller."""
    print(f"\n✅ Buyer confirming delivery (App {app_id})...")
    txn = transaction.ApplicationNoOpTxn(
        sender=buyer_address,
        sp=get_params(),
        index=app_id,
        app_args=[b"confirm"],
    )
    signed = txn.sign(buyer_private_key)
    txid   = client.send_transaction(signed)
    wait_for_confirmation(txid)
    print(f"   ✅ Delivery confirmed! Funds released to seller. TxID: {txid}")
    return txid


def opt_in_ecopoints(user_private_key: str, user_address: str, app_id: int):
    """User opts into the EcoPoints contract."""
    txn = transaction.ApplicationOptInTxn(
        sender=user_address,
        sp=get_params(),
        index=app_id,
    )
    signed = txn.sign(user_private_key)
    txid   = client.send_transaction(signed)
    wait_for_confirmation(txid)
    print(f"   ✅ {user_address[:8]}... opted into EcoPoints (App {app_id})")


def record_trade_ecopoints(
    admin_private_key: str,
    admin_address: str,
    eco_app_id: int,
    seller_address: str,
    buyer_address: str,
    co2_saved: int,
    eco_points: int,
):
    """Admin records completed trade in EcoPoints contract."""
    txn = transaction.ApplicationNoOpTxn(
        sender=admin_address,
        sp=get_params(),
        index=eco_app_id,
        app_args=[
            b"record_trade",
            decode_address(seller_address),
            decode_address(buyer_address),
            co2_saved.to_bytes(8, "big"),
            eco_points.to_bytes(8, "big"),
        ],
        accounts=[seller_address, buyer_address],
    )
    signed = txn.sign(admin_private_key)
    txid   = client.send_transaction(signed)
    wait_for_confirmation(txid)
    print(f"   ✅ Trade recorded on EcoPoints contract. TxID: {txid}")


def read_app_global_state(app_id: int) -> dict:
    app_info = client.application_info(app_id)
    raw = app_info.get("params", {}).get("global-state", [])
    result = {}
    for kv in raw:
        key = base64.b64decode(kv["key"]).decode(errors="replace")
        val = kv["value"]
        if val["type"] == 1:
            result[key] = val["uint"]
        else:
            result[key] = base64.b64decode(val["bytes"]).decode(errors="replace")
    return result


def read_user_local_state(user_address: str, app_id: int) -> dict:
    acct = client.account_info(user_address)
    for app_local in acct.get("apps-local-state", []):
        if app_local["id"] == app_id:
            result = {}
            for kv in app_local.get("key-value", []):
                key = base64.b64decode(kv["key"]).decode(errors="replace")
                val = kv["value"]
                if val["type"] == 1:
                    result[key] = val["uint"]
                else:
                    result[key] = base64.b64decode(val["bytes"]).decode(errors="replace")
            return result
    return {}


# ─── Full End-to-End Demo ──────────────────────────────────────────────────────

def run_full_demo():
    print("=" * 60)
    print("🎓 CampusBazaar - Algorand Testnet Demo")
    print("=" * 60)

    # 1. Generate accounts
    print("\n1️⃣  Generating demo accounts...")
    admin  = generate_account()
    seller = generate_account()
    buyer  = generate_account()

    print(f"   Admin  : {admin['address']}")
    print(f"   Seller : {seller['address']}")
    print(f"   Buyer  : {buyer['address']}")

    # Save accounts to file
    accounts = {"admin": admin, "seller": seller, "buyer": buyer}
    os.makedirs("demo_data", exist_ok=True)
    with open("demo_data/accounts.json", "w") as f:
        json.dump(accounts, f, indent=2)
    print("   Accounts saved to demo_data/accounts.json")

    # 2. Fund accounts from testnet dispenser
    print("\n2️⃣  Fund accounts from dispenser...")
    for name, acc in [("Admin", admin), ("Seller", seller), ("Buyer", buyer)]:
        fund_from_dispenser(acc["address"])

    # 3. Deploy EcoPoints contract
    print("\n3️⃣  Deploying EcoPoints contract...")
    eco_app_id = deploy_ecopoints_contract(admin["private_key"], admin["address"])

    # 4. Opt in to EcoPoints
    print("\n4️⃣  Opting users into EcoPoints...")
    opt_in_ecopoints(seller["private_key"], seller["address"], eco_app_id)
    opt_in_ecopoints(buyer["private_key"],  buyer["address"],  eco_app_id)

    # 5. Deploy listing escrow (e.g. sell a used textbook for 5 ALGO)
    print("\n5️⃣  Seller lists a used DSP textbook...")
    listing = deploy_listing_escrow(
        seller_private_key  = seller["private_key"],
        seller_address      = seller["address"],
        title               = "DSP Textbook - Proakis (Very Good Condition)",
        price_microalgo     = 5_000_000,  # 5 ALGO
        category            = "books",
        co2_saved           = 800,
        eco_points          = 20,
        platform_fee_address = admin["address"],
    )

    # 6. Buyer funds escrow
    print("\n6️⃣  Buyer purchases the textbook...")
    buyer_fund_escrow(
        buyer_private_key = buyer["private_key"],
        buyer_address     = buyer["address"],
        app_id            = listing["app_id"],
        app_address       = listing["app_address"],
        price_microalgo   = 5_000_000,
    )

    # 7. Read escrow state
    print("\n7️⃣  Escrow contract state:")
    state = read_app_global_state(listing["app_id"])
    print(f"   {json.dumps(state, indent=4)}")

    # 8. Buyer confirms delivery
    print("\n8️⃣  Buyer confirms textbook received...")
    buyer_confirm_delivery(
        buyer_private_key = buyer["private_key"],
        buyer_address     = buyer["address"],
        app_id            = listing["app_id"],
    )

    # 9. Record trade on EcoPoints
    print("\n9️⃣  Recording eco-points on-chain...")
    record_trade_ecopoints(
        admin_private_key = admin["private_key"],
        admin_address     = admin["address"],
        eco_app_id        = eco_app_id,
        seller_address    = seller["address"],
        buyer_address     = buyer["address"],
        co2_saved         = 800,
        eco_points        = 20,
    )

    # 10. Read EcoPoints
    print("\n🔟 Final EcoPoints state:")
    seller_pts = read_user_local_state(seller["address"], eco_app_id)
    buyer_pts  = read_user_local_state(buyer["address"],  eco_app_id)
    print(f"   Seller: {json.dumps(seller_pts, indent=4)}")
    print(f"   Buyer:  {json.dumps(buyer_pts,  indent=4)}")

    # 11. Save deployment info
    deploy_info = {
        "eco_app_id":     eco_app_id,
        "listing_app_id": listing["app_id"],
        "listing_address": listing["app_address"],
        "admin_address":  admin["address"],
        "seller_address": seller["address"],
        "buyer_address":  buyer["address"],
    }
    with open("demo_data/deployment.json", "w") as f:
        json.dump(deploy_info, f, indent=2)

    print("\n" + "=" * 60)
    print("✅  Demo complete!")
    print(f"   EcoPoints App ID : {eco_app_id}")
    print(f"   Escrow App ID    : {listing['app_id']}")
    print(f"   View on explorer : https://testnet.algoexplorer.io/application/{listing['app_id']}")
    print("=" * 60)

    return deploy_info


if __name__ == "__main__":
    run_full_demo()
