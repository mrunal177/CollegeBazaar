"""
CampusBazaar - EcoPoints & Reputation Contract
Tracks sustainability scores and reputation for campus traders.

This is a single shared contract (one instance per campus deployment).
It records eco-points and trade count for each address.

Local State per user (opt-in required):
  eco_points      : uint   (cumulative eco-points earned)
  trades_completed: uint   (total completed trades)
  trades_as_seller: uint   (as seller)
  trades_as_buyer : uint   (as buyer)
  co2_saved_grams : uint   (total grams CO2 saved)
  reputation_score: uint   (0-100 composite score)
  last_trade_round: uint   (round of last completed trade)
  college_verified: uint   (0 or 1, set by admin)

Global State:
  admin            : bytes  (platform admin address)
  total_co2_saved  : uint   (platform-wide CO2 saved, grams)
  total_trades     : uint   (platform-wide completed trades)
  total_users      : uint   (users opted in)
"""

from pyteal import *

# Keys
KEY_ADMIN            = Bytes("admin")
KEY_TOTAL_CO2        = Bytes("total_co2_saved")
KEY_TOTAL_TRADES     = Bytes("total_trades")
KEY_TOTAL_USERS      = Bytes("total_users")

LKEY_ECO_POINTS      = Bytes("eco_points")
LKEY_TRADES_DONE     = Bytes("trades_completed")
LKEY_TRADES_SELLER   = Bytes("trades_as_seller")
LKEY_TRADES_BUYER    = Bytes("trades_as_buyer")
LKEY_CO2_SAVED       = Bytes("co2_saved_grams")
LKEY_REP_SCORE       = Bytes("reputation_score")
LKEY_LAST_TRADE      = Bytes("last_trade_round")
LKEY_VERIFIED        = Bytes("college_verified")

# Eco-point calculation weights
BASE_TRADE_POINTS  = Int(50)    # per completed trade
CO2_POINT_DIVISOR  = Int(100)   # 1 point per 100g CO2 saved
SELLER_BONUS       = Int(20)    # bonus for sellers (encouraged supply)
VERIFICATION_BONUS = Int(100)   # one-time bonus for college email verification

MAX_REP_SCORE      = Int(100)

# ─── Reputation scoring formula ───────────────────────────────────────────────
# reputation = min(100, trades_completed * 5 + eco_points / 10)
def compute_reputation(addr: Expr) -> Expr:
    trades = App.localGet(addr, LKEY_TRADES_DONE)
    points = App.localGet(addr, LKEY_ECO_POINTS)
    raw = trades * Int(5) + points / Int(10)
    return If(raw > MAX_REP_SCORE, MAX_REP_SCORE, raw)


def approval_program():

    # ── on_creation ────────────────────────────────────────────────────────────
    on_create = Seq([
        Assert(Txn.application_args.length() == Int(1)),  # [admin_address]
        App.globalPut(KEY_ADMIN,        Txn.application_args[0]),
        App.globalPut(KEY_TOTAL_CO2,    Int(0)),
        App.globalPut(KEY_TOTAL_TRADES, Int(0)),
        App.globalPut(KEY_TOTAL_USERS,  Int(0)),
        Approve(),
    ])

    # ── opt_in: user registers ─────────────────────────────────────────────────
    on_opt_in = Seq([
        App.localPut(Txn.sender(), LKEY_ECO_POINTS,    Int(0)),
        App.localPut(Txn.sender(), LKEY_TRADES_DONE,   Int(0)),
        App.localPut(Txn.sender(), LKEY_TRADES_SELLER, Int(0)),
        App.localPut(Txn.sender(), LKEY_TRADES_BUYER,  Int(0)),
        App.localPut(Txn.sender(), LKEY_CO2_SAVED,     Int(0)),
        App.localPut(Txn.sender(), LKEY_REP_SCORE,     Int(0)),
        App.localPut(Txn.sender(), LKEY_LAST_TRADE,    Int(0)),
        App.localPut(Txn.sender(), LKEY_VERIFIED,      Int(0)),
        App.globalPut(KEY_TOTAL_USERS, App.globalGet(KEY_TOTAL_USERS) + Int(1)),
        Approve(),
    ])

    # ── record_trade: called by the escrow contract upon confirmation ──────────
    # Args: [seller_addr, buyer_addr, co2_saved_grams, eco_points_value]
    # Only callable by admin (platform backend) in hackathon version.
    # Production: verify caller is a valid marketplace escrow contract.

    seller_addr  = Txn.application_args[1]
    buyer_addr   = Txn.application_args[2]
    co2_grams    = Btoi(Txn.application_args[3])
    eco_pts_val  = Btoi(Txn.application_args[4])

    on_record_trade = Seq([
        Assert(Txn.sender() == App.globalGet(KEY_ADMIN)),
        Assert(Txn.application_args.length() == Int(5)),

        # Update seller local state
        App.localPut(seller_addr, LKEY_ECO_POINTS,
            App.localGet(seller_addr, LKEY_ECO_POINTS) + eco_pts_val + SELLER_BONUS),
        App.localPut(seller_addr, LKEY_TRADES_DONE,
            App.localGet(seller_addr, LKEY_TRADES_DONE) + Int(1)),
        App.localPut(seller_addr, LKEY_TRADES_SELLER,
            App.localGet(seller_addr, LKEY_TRADES_SELLER) + Int(1)),
        App.localPut(seller_addr, LKEY_CO2_SAVED,
            App.localGet(seller_addr, LKEY_CO2_SAVED) + co2_grams),
        App.localPut(seller_addr, LKEY_LAST_TRADE, Global.round()),
        App.localPut(seller_addr, LKEY_REP_SCORE, compute_reputation(seller_addr)),

        # Update buyer local state
        App.localPut(buyer_addr, LKEY_ECO_POINTS,
            App.localGet(buyer_addr, LKEY_ECO_POINTS) + eco_pts_val),
        App.localPut(buyer_addr, LKEY_TRADES_DONE,
            App.localGet(buyer_addr, LKEY_TRADES_DONE) + Int(1)),
        App.localPut(buyer_addr, LKEY_TRADES_BUYER,
            App.localGet(buyer_addr, LKEY_TRADES_BUYER) + Int(1)),
        App.localPut(buyer_addr, LKEY_CO2_SAVED,
            App.localGet(buyer_addr, LKEY_CO2_SAVED) + co2_grams),
        App.localPut(buyer_addr, LKEY_LAST_TRADE, Global.round()),
        App.localPut(buyer_addr, LKEY_REP_SCORE, compute_reputation(buyer_addr)),

        # Update global totals
        App.globalPut(KEY_TOTAL_CO2,
            App.globalGet(KEY_TOTAL_CO2) + co2_grams),
        App.globalPut(KEY_TOTAL_TRADES,
            App.globalGet(KEY_TOTAL_TRADES) + Int(1)),

        Approve(),
    ])

    # ── verify_college: admin marks user as college-verified ──────────────────
    # Args: [target_address]
    on_verify_college = Seq([
        Assert(Txn.sender() == App.globalGet(KEY_ADMIN)),
        Assert(Txn.application_args.length() == Int(2)),
        Assert(App.localGet(Txn.application_args[1], LKEY_VERIFIED) == Int(0)),  # Not already verified

        App.localPut(Txn.application_args[1], LKEY_VERIFIED, Int(1)),
        # Award one-time verification bonus
        App.localPut(Txn.application_args[1], LKEY_ECO_POINTS,
            App.localGet(Txn.application_args[1], LKEY_ECO_POINTS) + VERIFICATION_BONUS),
        App.localPut(Txn.application_args[1], LKEY_REP_SCORE,
            compute_reputation(Txn.application_args[1])),

        Approve(),
    ])

    # ── Router ──────────────────────────────────────────────────────────────────
    program = Cond(
        [Txn.application_id() == Int(0),                   on_create],
        [Txn.on_completion() == OnComplete.OptIn,           on_opt_in],
        [Txn.application_args[0] == Bytes("record_trade"),  on_record_trade],
        [Txn.application_args[0] == Bytes("verify"),        on_verify_college],
    )

    return program


def clear_program():
    return Seq([
        App.globalPut(KEY_TOTAL_USERS,
            App.globalGet(KEY_TOTAL_USERS) - Int(1)),
        Approve(),
    ])


if __name__ == "__main__":
    import os
    from pyteal import compileTeal, Mode

    os.makedirs("build", exist_ok=True)

    approval = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear    = compileTeal(clear_program(),    mode=Mode.Application, version=8)

    with open("build/ecopoints_approval.teal", "w") as f:
        f.write(approval)
    with open("build/ecopoints_clear.teal", "w") as f:
        f.write(clear)

    print("✅  Compiled ecopoints_approval.teal and ecopoints_clear.teal → build/")
