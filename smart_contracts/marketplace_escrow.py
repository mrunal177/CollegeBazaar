"""
CampusBazaar - Smart Contract Escrow for Campus Marketplace
Built on Algorand using PyTeal / AVM

Escrow Flow:
  1. Seller lists item → deploys this contract
  2. Buyer funds escrow → payment locked in contract
  3. Buyer confirms delivery → funds released to seller
  4. Dispute / no confirmation after timeout → buyer gets refund

Global State Schema:
  seller           : bytes  (seller address)
  buyer            : bytes  (buyer address, set when buyer funds)
  item_price       : uint   (in microALGO)
  item_title       : bytes  (item name, max 64 chars)
  item_category    : bytes  (e.g. "books", "cycles", "electronics")
  item_co2_saved   : uint   (grams of CO2 saved, set at listing)
  status           : bytes  ("open" | "funded" | "confirmed" | "refunded" | "disputed")
  funded_at        : uint   (round number when buyer funded)
  eco_points_value : uint   (eco-points to award on completion)
  dispute_reason   : bytes  (set if disputed)
"""

from pyteal import *

# ─── Constants ────────────────────────────────────────────────────────────────
TIMEOUT_ROUNDS = Int(1000)        # ~55 minutes on Algorand (~3.3s/round)
DISPUTE_WINDOW_ROUNDS = Int(500)  # Window after funding where buyer can raise dispute
PLATFORM_FEE_BPS = Int(100)       # 1% platform fee (100 basis points)
MIN_ITEM_PRICE = Int(1_000_000)   # 1 ALGO minimum listing price

# Global state keys
KEY_SELLER          = Bytes("seller")
KEY_BUYER           = Bytes("buyer")
KEY_ITEM_PRICE      = Bytes("item_price")
KEY_ITEM_TITLE      = Bytes("item_title")
KEY_ITEM_CATEGORY   = Bytes("item_category")
KEY_CO2_SAVED       = Bytes("item_co2_saved")
KEY_STATUS          = Bytes("status")
KEY_FUNDED_AT       = Bytes("funded_at")
KEY_ECO_PTS         = Bytes("eco_points_value")
KEY_DISPUTE_REASON  = Bytes("dispute_reason")
KEY_PLATFORM_FEE_ADDR = Bytes("platform_fee_addr")

STATUS_OPEN       = Bytes("open")
STATUS_FUNDED     = Bytes("funded")
STATUS_CONFIRMED  = Bytes("confirmed")
STATUS_REFUNDED   = Bytes("refunded")
STATUS_DISPUTED   = Bytes("disputed")

# ─── Helpers ──────────────────────────────────────────────────────────────────

def is_seller() -> Expr:
    return Txn.sender() == App.globalGet(KEY_SELLER)

def is_buyer() -> Expr:
    return Txn.sender() == App.globalGet(KEY_BUYER)

def has_status(s: Bytes) -> Expr:
    return App.globalGet(KEY_STATUS) == s

def platform_fee(amount: Expr) -> Expr:
    """Calculate 1% platform fee from amount."""
    return amount * PLATFORM_FEE_BPS / Int(10_000)

def seller_payout(amount: Expr) -> Expr:
    """Seller receives amount minus platform fee."""
    return amount - platform_fee(amount)

# ─── Approval Program ─────────────────────────────────────────────────────────

def approval_program():

    # ── on_creation: seller deploys the contract ──────────────────────────────
    on_create = Seq([
        # Validate args: [item_title, item_price, item_category, co2_saved_grams, eco_points, platform_fee_addr]
        Assert(Txn.application_args.length() == Int(6)),
        Assert(Btoi(Txn.application_args[1]) >= MIN_ITEM_PRICE),
        Assert(Len(Txn.application_args[0]) <= Int(64)),

        App.globalPut(KEY_SELLER,           Txn.sender()),
        App.globalPut(KEY_ITEM_TITLE,       Txn.application_args[0]),
        App.globalPut(KEY_ITEM_PRICE,       Btoi(Txn.application_args[1])),
        App.globalPut(KEY_ITEM_CATEGORY,    Txn.application_args[2]),
        App.globalPut(KEY_CO2_SAVED,        Btoi(Txn.application_args[3])),
        App.globalPut(KEY_ECO_PTS,          Btoi(Txn.application_args[4])),
        App.globalPut(KEY_PLATFORM_FEE_ADDR,Txn.application_args[5]),
        App.globalPut(KEY_STATUS,           STATUS_OPEN),
        App.globalPut(KEY_BUYER,            Bytes("")),
        App.globalPut(KEY_DISPUTE_REASON,   Bytes("")),
        App.globalPut(KEY_FUNDED_AT,        Int(0)),
        Approve(),
    ])

    # ── fund_escrow: buyer locks payment into contract ─────────────────────────
    # Expected: atomic group of [ApplicationCall, PaymentTxn]
    buyer_payment = Gtxn[1]
    on_fund_escrow = Seq([
        Assert(has_status(STATUS_OPEN)),
        Assert(Not(is_seller())),                          # Seller cannot buy own item
        Assert(Global.group_size() == Int(2)),
        Assert(buyer_payment.type_enum() == TxnType.Payment),
        Assert(buyer_payment.sender() == Txn.sender()),
        Assert(buyer_payment.receiver() == Global.current_application_address()),
        Assert(buyer_payment.amount() == App.globalGet(KEY_ITEM_PRICE)),
        Assert(buyer_payment.close_remainder_to() == Global.zero_address()),

        App.globalPut(KEY_BUYER,     Txn.sender()),
        App.globalPut(KEY_STATUS,    STATUS_FUNDED),
        App.globalPut(KEY_FUNDED_AT, Global.round()),
        Approve(),
    ])

    # ── confirm_delivery: buyer confirms item received ─────────────────────────
    price = App.globalGet(KEY_ITEM_PRICE)
    fee_addr = App.globalGet(KEY_PLATFORM_FEE_ADDR)

    on_confirm = Seq([
        Assert(has_status(STATUS_FUNDED)),
        Assert(is_buyer()),

        App.globalPut(KEY_STATUS, STATUS_CONFIRMED),

        # Pay platform fee
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum:  TxnType.Payment,
            TxnField.receiver:   fee_addr,
            TxnField.amount:     platform_fee(price),
            TxnField.fee:        Int(0),
        }),
        InnerTxnBuilder.Submit(),

        # Pay seller (price - fee)
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum:  TxnType.Payment,
            TxnField.receiver:   App.globalGet(KEY_SELLER),
            TxnField.amount:     seller_payout(price),
            TxnField.fee:        Int(0),
        }),
        InnerTxnBuilder.Submit(),

        Approve(),
    ])

    # ── request_refund: buyer can reclaim funds if seller doesn't deliver ──────
    on_refund = Seq([
        Assert(has_status(STATUS_FUNDED)),
        Assert(is_buyer()),
        # Only allow refund after timeout rounds have passed
        Assert(Global.round() >= App.globalGet(KEY_FUNDED_AT) + TIMEOUT_ROUNDS),

        App.globalPut(KEY_STATUS, STATUS_REFUNDED),

        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields({
            TxnField.type_enum:  TxnType.Payment,
            TxnField.receiver:   App.globalGet(KEY_BUYER),
            TxnField.amount:     price,
            TxnField.fee:        Int(0),
        }),
        InnerTxnBuilder.Submit(),

        Approve(),
    ])

    # ── raise_dispute: buyer raises dispute within dispute window ──────────────
    # Args: [dispute_reason_string]
    on_dispute = Seq([
        Assert(has_status(STATUS_FUNDED)),
        Assert(is_buyer()),
        Assert(Txn.application_args.length() == Int(2)),
        Assert(Global.round() <= App.globalGet(KEY_FUNDED_AT) + DISPUTE_WINDOW_ROUNDS),

        App.globalPut(KEY_STATUS,         STATUS_DISPUTED),
        App.globalPut(KEY_DISPUTE_REASON, Txn.application_args[1]),

        Approve(),
    ])

    # ── resolve_dispute: seller or platform resolves a disputed trade ──────────
    # Args: [resolve_in_favor_of]  "buyer" | "seller"
    # NOTE: In production this would require a multi-sig or DAO vote.
    #       For hackathon we allow seller to resolve (demonstrates concept).
    on_resolve = Seq([
        Assert(has_status(STATUS_DISPUTED)),
        Assert(is_seller()),
        Assert(Txn.application_args.length() == Int(2)),

        Cond(
            [Txn.application_args[1] == Bytes("buyer"), Seq([
                App.globalPut(KEY_STATUS, STATUS_REFUNDED),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver:  App.globalGet(KEY_BUYER),
                    TxnField.amount:    price,
                    TxnField.fee:       Int(0),
                }),
                InnerTxnBuilder.Submit(),
            ])],
            [Txn.application_args[1] == Bytes("seller"), Seq([
                App.globalPut(KEY_STATUS, STATUS_CONFIRMED),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver:  fee_addr,
                    TxnField.amount:    platform_fee(price),
                    TxnField.fee:       Int(0),
                }),
                InnerTxnBuilder.Submit(),
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver:  App.globalGet(KEY_SELLER),
                    TxnField.amount:    seller_payout(price),
                    TxnField.fee:       Int(0),
                }),
                InnerTxnBuilder.Submit(),
            ])],
        ),
        Approve(),
    ])

    # ── delete_listing: seller can delist if item still open ──────────────────
    on_delete = Seq([
        Assert(has_status(STATUS_OPEN)),
        Assert(is_seller()),
        Approve(),
    ])

    # ── Router ──────────────────────────────────────────────────────────────────
    program = Cond(
        [Txn.application_id() == Int(0),                    on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, on_delete],
        [Txn.application_args[0] == Bytes("fund_escrow"),   on_fund_escrow],
        [Txn.application_args[0] == Bytes("confirm"),       on_confirm],
        [Txn.application_args[0] == Bytes("refund"),        on_refund],
        [Txn.application_args[0] == Bytes("dispute"),       on_dispute],
        [Txn.application_args[0] == Bytes("resolve"),       on_resolve],
    )

    return program


def clear_program():
    """
    On clear: if contract is funded, return money to buyer.
    This prevents funds being locked forever.
    """
    return Seq([
        If(
            App.globalGet(KEY_STATUS) == STATUS_FUNDED,
            Seq([
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields({
                    TxnField.type_enum: TxnType.Payment,
                    TxnField.receiver:  App.globalGet(KEY_BUYER),
                    TxnField.amount:    App.globalGet(KEY_ITEM_PRICE),
                    TxnField.fee:       Int(0),
                }),
                InnerTxnBuilder.Submit(),
            ]),
        ),
        Approve(),
    ])


if __name__ == "__main__":
    import os
    from pyteal import compileTeal, Mode

    os.makedirs("build", exist_ok=True)

    approval = compileTeal(approval_program(), mode=Mode.Application, version=8)
    clear = compileTeal(clear_program(), mode=Mode.Application, version=8)

    with open("build/approval.teal", "w") as f:
        f.write(approval)
    with open("build/clear.teal", "w") as f:
        f.write(clear)

    print("✅  Compiled approval.teal and clear.teal → build/")
    print(f"   Approval TEAL lines : {len(approval.splitlines())}")
    print(f"   Clear TEAL lines    : {len(clear.splitlines())}")
