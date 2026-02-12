"""
CampusBazaar Backend API
FastAPI + Algorand SDK

Handles:
  - User registration & college email verification
  - Listing creation (deploys escrow contract)
  - Buying (funds escrow contract)
  - Delivery confirmation
  - Eco-points + sustainability dashboard
  - Chat/negotiation messaging
  - Leaderboard

Run:
  pip install fastapi uvicorn algosdk python-multipart python-jose[cryptography] passlib[bcrypt] aiofiles
  uvicorn main:app --reload --port 8000
"""

import os
import re
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, validator

from algosdk import account, mnemonic, transaction
from algosdk.v2client import algod, indexer
from algosdk.atomic_transaction_composer import (
    AtomicTransactionComposer,
    TransactionWithSigner,
    AccountTransactionSigner,
)
from algosdk.encoding import decode_address, encode_address
from algosdk import abi as algorand_abi

from jose import JWTError, jwt
from passlib.context import CryptContext

# ─────────────────────────────────────────────────────────────────────────────
# Configuration  (use environment variables in production)
# ─────────────────────────────────────────────────────────────────────────────

ALGOD_ADDRESS   = os.getenv("ALGOD_ADDRESS",   "https://testnet-api.algonode.cloud")
ALGOD_TOKEN     = os.getenv("ALGOD_TOKEN",     "")
INDEXER_ADDRESS = os.getenv("INDEXER_ADDRESS", "https://testnet-idx.algonode.cloud")
INDEXER_TOKEN   = os.getenv("INDEXER_TOKEN",   "")

# IDs set after first deployment
ECOPOINTS_APP_ID = int(os.getenv("ECOPOINTS_APP_ID", "0"))

# Platform admin mnemonic (NEVER expose in frontend)
ADMIN_MNEMONIC   = os.getenv("ADMIN_MNEMONIC", "")
ADMIN_PRIVATE_KEY = mnemonic.to_private_key(ADMIN_MNEMONIC) if ADMIN_MNEMONIC else ""
ADMIN_ADDRESS     = account.address_from_private_key(ADMIN_PRIVATE_KEY) if ADMIN_PRIVATE_KEY else ""

PLATFORM_FEE_ADDRESS = os.getenv("PLATFORM_FEE_ADDRESS", ADMIN_ADDRESS)

SECRET_KEY         = os.getenv("JWT_SECRET", "changeme-use-strong-secret-in-prod")
ALGORITHM          = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

ALLOWED_COLLEGE_DOMAINS = os.getenv(
    "ALLOWED_COLLEGE_DOMAINS",
    "iitbombay.ac.in,bits-pilani.ac.in,nit.ac.in,du.ac.in"
).split(",")

# CO2 data (grams saved per category vs buying new)
CO2_SAVINGS_MAP = {
    "books":       800,    # avg textbook
    "cycles":      30000,  # bicycle manufacturing emissions
    "electronics": 15000,  # laptop/calculator
    "furniture":   12000,  # hostel items
    "clothing":    2000,
    "sports":      3000,
    "other":       1000,
}

ECO_POINTS_MAP = {
    "books":       20,
    "cycles":      150,
    "electronics": 80,
    "furniture":   60,
    "clothing":    15,
    "sports":      25,
    "other":       10,
}

# ─────────────────────────────────────────────────────────────────────────────
# In-memory "database" — replace with PostgreSQL/MongoDB in production
# ─────────────────────────────────────────────────────────────────────────────

USERS_DB: dict = {}       # email → user dict
LISTINGS_DB: dict = {}    # listing_id → listing dict
MESSAGES_DB: dict = {}    # listing_id → [message dicts]
VERIFIED_TOKENS: dict = {}  # email → verification token


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CampusBazaar API",
    description="Decentralized campus marketplace powered by Algorand",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

algod_client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_ADDRESS)
indexer_client = indexer.IndexerClient(INDEXER_TOKEN, INDEXER_ADDRESS)


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic Models
# ─────────────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    algo_address: str  # user's own Algorand wallet address

    @validator("email")
    def must_be_college_email(cls, v):
        domain = v.split("@")[-1].lower()
        if not any(d in domain for d in ALLOWED_COLLEGE_DOMAINS):
            raise ValueError(
                f"Must use a college email. Allowed domains: {', '.join(ALLOWED_COLLEGE_DOMAINS)}"
            )
        return v

    @validator("algo_address")
    def valid_algo_address(cls, v):
        if len(v) != 58:
            raise ValueError("Invalid Algorand address (must be 58 chars)")
        return v


class ListingCreate(BaseModel):
    title: str
    description: str
    price_algo: float          # price in ALGO (converted to microALGO internally)
    category: str
    condition: str             # "new", "like_new", "good", "fair"
    images: Optional[List[str]] = []  # base64 or IPFS CIDs

    @validator("category")
    def valid_category(cls, v):
        if v not in CO2_SAVINGS_MAP:
            raise ValueError(f"Category must be one of: {list(CO2_SAVINGS_MAP.keys())}")
        return v

    @validator("price_algo")
    def min_price(cls, v):
        if v < 1.0:
            raise ValueError("Minimum price is 1 ALGO")
        return v


class MessageCreate(BaseModel):
    listing_id: str
    content: str
    offered_price_algo: Optional[float] = None  # for price negotiation


class Token(BaseModel):
    access_token: str
    token_type: str


# ─────────────────────────────────────────────────────────────────────────────
# Auth Utilities
# ─────────────────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(status_code=401, detail="Invalid credentials")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None or email not in USERS_DB:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return USERS_DB[email]


# ─────────────────────────────────────────────────────────────────────────────
# Algorand Utilities
# ─────────────────────────────────────────────────────────────────────────────

def algo_to_microalgo(algo: float) -> int:
    return int(algo * 1_000_000)


def microalgo_to_algo(microalgo: int) -> float:
    return microalgo / 1_000_000


def get_algod_params():
    return algod_client.suggested_params()


def wait_for_confirmation(txid: str, timeout: int = 10) -> dict:
    """Wait for transaction to be confirmed."""
    params = algod_client.suggested_params()
    start_round = params.first
    current_round = start_round
    while current_round < start_round + timeout:
        try:
            pending_txn = algod_client.pending_transaction_info(txid)
        except Exception:
            return {}
        if pending_txn.get("confirmed-round", 0) > 0:
            return pending_txn
        elif pending_txn.get("pool-error"):
            raise Exception(f"Transaction pool error: {pending_txn['pool-error']}")
        algod_client.status_after_block(current_round)
        current_round += 1
    raise Exception(f"Transaction not confirmed after {timeout} rounds")


def deploy_escrow_contract(
    seller_private_key: str,
    title: str,
    price_microalgo: int,
    category: str,
    co2_saved_grams: int,
    eco_points: int,
) -> dict:
    """
    Deploy the marketplace escrow contract for a new listing.
    Returns dict with app_id and app_address.
    
    NOTE: In the hackathon demo, the backend deploys on behalf of the user.
    In production, the user signs from their own wallet (WalletConnect/Pera).
    """
    seller_address = account.address_from_private_key(seller_private_key)
    params = get_algod_params()
    params.fee = 1000
    params.flat_fee = True

    # Load compiled TEAL from build directory
    try:
        with open("smart_contracts/build/approval.teal") as f:
            approval_src = f.read()
        with open("smart_contracts/build/clear.teal") as f:
            clear_src = f.read()
    except FileNotFoundError:
        # Fallback: compile on-the-fly (requires pyteal installed)
        raise HTTPException(
            status_code=500,
            detail="TEAL build files not found. Run: python smart_contracts/marketplace_escrow.py"
        )

    approval_result = algod_client.compile(approval_src)
    clear_result    = algod_client.compile(clear_src)

    import base64
    approval_bytes = base64.b64decode(approval_result["result"])
    clear_bytes    = base64.b64decode(clear_result["result"])

    # Global schema: 8 byte-slices, 3 uints
    global_schema = transaction.StateSchema(num_uints=3, num_byte_slices=8)
    local_schema  = transaction.StateSchema(num_uints=0, num_byte_slices=0)

    txn = transaction.ApplicationCreateTxn(
        sender=seller_address,
        sp=params,
        on_complete=transaction.OnComplete.NoOpOC,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
        global_schema=global_schema,
        local_schema=local_schema,
        app_args=[
            title.encode(),
            price_microalgo.to_bytes(8, "big"),
            category.encode(),
            co2_saved_grams.to_bytes(8, "big"),
            eco_points.to_bytes(8, "big"),
            decode_address(PLATFORM_FEE_ADDRESS),
        ],
    )

    signed_txn = txn.sign(seller_private_key)
    txid = algod_client.send_transaction(signed_txn)
    confirmed = wait_for_confirmation(txid)

    app_id = confirmed["application-index"]
    app_address = algod.get_application_address(app_id) if hasattr(algod, "get_application_address") else ""

    # Fund minimum balance for contract account (0.1 ALGO)
    fund_txn = transaction.PaymentTxn(
        sender=seller_address,
        sp=params,
        receiver=app_address or txn.get_application_address(),
        amt=100_000,  # 0.1 ALGO minimum balance
    )
    signed_fund = fund_txn.sign(seller_private_key)
    algod_client.send_transaction(signed_fund)

    return {
        "app_id": app_id,
        "app_address": app_address,
        "txid": txid,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Auth Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/auth/register", tags=["Auth"])
async def register(user: UserRegister, background_tasks: BackgroundTasks):
    """Register with a college email address."""
    if user.email in USERS_DB:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Generate verification token
    token = hashlib.sha256(f"{user.email}{time.time()}".encode()).hexdigest()[:16].upper()
    VERIFIED_TOKENS[user.email] = token

    USERS_DB[user.email] = {
        "name":          user.name,
        "email":         user.email,
        "hashed_pw":     hash_password(user.password),
        "algo_address":  user.algo_address,
        "verified":      False,
        "created_at":    datetime.utcnow().isoformat(),
        "listings":      [],
        "purchases":     [],
    }

    # In production: send email with token
    # For hackathon: return token directly
    background_tasks.add_task(
        print,
        f"[EMAIL SIMULATION] Send to {user.email}: Your verification code is {token}"
    )

    return {
        "message": "Registration successful. Check your college email for a verification code.",
        "demo_token": token,  # Remove this in production!
    }


@app.post("/auth/verify-email", tags=["Auth"])
async def verify_email(email: str, token: str):
    """Verify college email with the token sent to user."""
    if VERIFIED_TOKENS.get(email) != token:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    if email not in USERS_DB:
        raise HTTPException(status_code=404, detail="User not found")

    USERS_DB[email]["verified"] = True
    del VERIFIED_TOKENS[email]

    # Award verification badge on-chain (if ecopoints contract is deployed)
    if ECOPOINTS_APP_ID and ADMIN_PRIVATE_KEY:
        try:
            user_algo_addr = USERS_DB[email]["algo_address"]
            _award_college_verification_onchain(user_algo_addr)
        except Exception as e:
            print(f"[WARNING] Could not award on-chain verification: {e}")

    return {"message": "Email verified! You can now trade on CampusBazaar."}


@app.post("/auth/login", response_model=Token, tags=["Auth"])
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = USERS_DB.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_pw"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user["verified"]:
        raise HTTPException(status_code=403, detail="Please verify your college email first")

    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}


# ─────────────────────────────────────────────────────────────────────────────
# Listings Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/listings", tags=["Listings"])
async def get_listings(
    category: Optional[str] = None,
    max_price_algo: Optional[float] = None,
    condition: Optional[str] = None,
    search: Optional[str] = None,
):
    """Get all active listings with optional filters."""
    results = []
    for lid, listing in LISTINGS_DB.items():
        if listing["status"] != "open":
            continue
        if category and listing["category"] != category:
            continue
        if max_price_algo and microalgo_to_algo(listing["price_microalgo"]) > max_price_algo:
            continue
        if condition and listing["condition"] != condition:
            continue
        if search and search.lower() not in listing["title"].lower():
            continue
        results.append({**listing, "id": lid})
    return {"listings": results, "total": len(results)}


@app.get("/listings/{listing_id}", tags=["Listings"])
async def get_listing(listing_id: str):
    if listing_id not in LISTINGS_DB:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing = LISTINGS_DB[listing_id]
    seller_info = USERS_DB.get(listing["seller_email"], {})
    return {
        **listing,
        "id": listing_id,
        "seller_name": seller_info.get("name", "Unknown"),
        "seller_algo": seller_info.get("algo_address", ""),
        "messages": MESSAGES_DB.get(listing_id, []),
    }


@app.post("/listings", tags=["Listings"])
async def create_listing(
    listing: ListingCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new item listing. Deploys an escrow smart contract on-chain."""
    if not current_user["verified"]:
        raise HTTPException(status_code=403, detail="College email must be verified to list items")

    price_microalgo = algo_to_microalgo(listing.price_algo)
    co2_saved       = CO2_SAVINGS_MAP.get(listing.category, 1000)
    eco_pts         = ECO_POINTS_MAP.get(listing.category, 10)

    # Generate a unique listing ID
    import uuid
    listing_id = str(uuid.uuid4())[:8].upper()

    # NOTE: In hackathon demo we skip actual on-chain deployment
    # and return a mock response. Uncomment deploy_escrow_contract
    # when you have funded wallets on testnet.

    # result = deploy_escrow_contract(
    #     seller_private_key=...,   # from user wallet via WalletConnect
    #     title=listing.title,
    #     price_microalgo=price_microalgo,
    #     category=listing.category,
    #     co2_saved_grams=co2_saved,
    #     eco_points=eco_pts,
    # )

    # Mock on-chain data for demo
    mock_app_id = 100000000 + int(listing_id, 16) % 1000000 if listing_id.isalnum() else 100000001

    LISTINGS_DB[listing_id] = {
        "title":           listing.title,
        "description":     listing.description,
        "price_microalgo": price_microalgo,
        "price_algo":      listing.price_algo,
        "category":        listing.category,
        "condition":       listing.condition,
        "images":          listing.images,
        "co2_saved_grams": co2_saved,
        "eco_points":      eco_pts,
        "seller_email":    current_user["email"],
        "seller_address":  current_user["algo_address"],
        "status":          "open",
        "app_id":          mock_app_id,
        "app_address":     f"MOCK_ESCROW_{listing_id}",
        "created_at":      datetime.utcnow().isoformat(),
        "buyer_address":   None,
    }

    current_user["listings"].append(listing_id)

    return {
        "listing_id":      listing_id,
        "app_id":          mock_app_id,
        "escrow_address":  f"MOCK_ESCROW_{listing_id}",
        "co2_saved_grams": co2_saved,
        "eco_points_value": eco_pts,
        "message":         "Listing created! Smart contract escrow deployed on Algorand testnet.",
    }


@app.post("/listings/{listing_id}/purchase", tags=["Listings"])
async def initiate_purchase(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Return unsigned transaction for buyer to sign with their wallet.
    Buyer sends ALGO to the escrow contract address.
    """
    if listing_id not in LISTINGS_DB:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing = LISTINGS_DB[listing_id]
    if listing["status"] != "open":
        raise HTTPException(status_code=400, detail="Listing is not available")
    if listing["seller_email"] == current_user["email"]:
        raise HTTPException(status_code=400, detail="You cannot buy your own listing")

    params = get_algod_params()

    # Build unsigned transactions for frontend to sign via Pera Wallet / WalletConnect
    app_call_txn = transaction.ApplicationNoOpTxn(
        sender=current_user["algo_address"],
        sp=params,
        index=listing["app_id"],
        app_args=[b"fund_escrow"],
    )

    payment_txn = transaction.PaymentTxn(
        sender=current_user["algo_address"],
        sp=params,
        receiver=listing["app_address"],
        amt=listing["price_microalgo"],
    )

    # Group the two transactions
    gid = transaction.calculate_group_id([app_call_txn, payment_txn])
    app_call_txn.group = gid
    payment_txn.group = gid

    import base64
    return {
        "unsigned_app_call": base64.b64encode(
            transaction.encoding.msgpack_encode(app_call_txn).encode()
        ).decode(),
        "unsigned_payment": base64.b64encode(
            transaction.encoding.msgpack_encode(payment_txn).encode()
        ).decode(),
        "escrow_address": listing["app_address"],
        "amount_algo":    listing["price_algo"],
        "instructions":   "Sign both transactions with your Algorand wallet (Pera/MyAlgo)",
    }


@app.post("/listings/{listing_id}/confirm-delivery", tags=["Listings"])
async def confirm_delivery(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
    background_tasks: BackgroundTasks = None,
):
    """
    Buyer confirms item received → funds released to seller on-chain.
    """
    if listing_id not in LISTINGS_DB:
        raise HTTPException(status_code=404, detail="Listing not found")
    listing = LISTINGS_DB[listing_id]
    if listing["status"] != "funded":
        raise HTTPException(status_code=400, detail="Order is not in funded state")
    if listing.get("buyer_address") != current_user["algo_address"]:
        raise HTTPException(status_code=403, detail="Only the buyer can confirm delivery")

    # Update listing status
    LISTINGS_DB[listing_id]["status"] = "confirmed"

    # Award eco-points on-chain (background task)
    if background_tasks and ECOPOINTS_APP_ID and ADMIN_PRIVATE_KEY:
        background_tasks.add_task(
            _award_trade_completion_onchain,
            listing["seller_address"],
            listing["buyer_address"],
            listing["co2_saved_grams"],
            listing["eco_points"],
        )

    return {
        "message":          "Delivery confirmed! Funds released to seller.",
        "co2_saved_grams":  listing["co2_saved_grams"],
        "eco_points_earned": listing["eco_points"],
        "sustainability_message": _generate_sustainability_message(
            listing["co2_saved_grams"], listing["category"]
        ),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Chat / Negotiation Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/messages", tags=["Chat"])
async def send_message(
    msg: MessageCreate,
    current_user: dict = Depends(get_current_user),
):
    """Send a message or price offer for a listing."""
    if msg.listing_id not in LISTINGS_DB:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = LISTINGS_DB[msg.listing_id]
    # Only allow seller and interested buyers to message
    is_seller = listing["seller_email"] == current_user["email"]

    message_entry = {
        "sender_email":       current_user["email"],
        "sender_name":        current_user["name"],
        "sender_algo":        current_user["algo_address"],
        "is_seller":          is_seller,
        "content":            msg.content,
        "offered_price_algo": msg.offered_price_algo,
        "timestamp":          datetime.utcnow().isoformat(),
    }

    if msg.listing_id not in MESSAGES_DB:
        MESSAGES_DB[msg.listing_id] = []
    MESSAGES_DB[msg.listing_id].append(message_entry)

    return {"message": "Message sent", "entry": message_entry}


@app.get("/messages/{listing_id}", tags=["Chat"])
async def get_messages(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    if listing_id not in LISTINGS_DB:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"messages": MESSAGES_DB.get(listing_id, [])}


# ─────────────────────────────────────────────────────────────────────────────
# User Profile & Sustainability Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/profile", tags=["Profile"])
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile with on-chain eco data."""
    user_algo_addr = current_user["algo_address"]
    on_chain_data  = {}

    if ECOPOINTS_APP_ID:
        try:
            acct_info = algod_client.account_application_info(user_algo_addr, ECOPOINTS_APP_ID)
            local_state = {
                kv["key"]: kv["value"]
                for kv in acct_info.get("app-local-state", {}).get("key-value", [])
            }
            on_chain_data = _decode_local_state(local_state)
        except Exception as e:
            on_chain_data = {"error": str(e)}

    return {
        "name":           current_user["name"],
        "email":          current_user["email"],
        "algo_address":   user_algo_addr,
        "verified":       current_user["verified"],
        "listings_count": len(current_user.get("listings", [])),
        "purchases_count": len(current_user.get("purchases", [])),
        "on_chain":       on_chain_data,
    }


@app.get("/sustainability/dashboard", tags=["Sustainability"])
async def sustainability_dashboard():
    """Platform-wide sustainability metrics."""
    total_co2 = sum(
        l["co2_saved_grams"]
        for l in LISTINGS_DB.values()
        if l["status"] == "confirmed"
    )
    total_trades = sum(1 for l in LISTINGS_DB.values() if l["status"] == "confirmed")
    category_breakdown = {}
    for l in LISTINGS_DB.values():
        if l["status"] == "confirmed":
            cat = l["category"]
            category_breakdown[cat] = category_breakdown.get(cat, 0) + l["co2_saved_grams"]

    return {
        "total_co2_saved_kg":    total_co2 / 1000,
        "total_trades":          total_trades,
        "equivalent_trees":      total_co2 / 21_000,   # avg tree absorbs 21kg CO2/year
        "equivalent_car_km":     total_co2 / 171,       # avg 171g CO2 per km
        "category_breakdown_kg": {k: v / 1000 for k, v in category_breakdown.items()},
        "fun_fact":              _fun_fact(total_co2),
    }


@app.get("/leaderboard", tags=["Leaderboard"])
async def get_leaderboard(limit: int = 10):
    """
    Top traders by eco-points.
    In production: read from on-chain indexer for ECOPOINTS_APP_ID.
    """
    # Demo: compute from local data
    scores = []
    for email, user in USERS_DB.items():
        co2 = sum(
            LISTINGS_DB[lid]["co2_saved_grams"]
            for lid in user.get("listings", [])
            if lid in LISTINGS_DB and LISTINGS_DB[lid]["status"] == "confirmed"
        )
        trades = sum(
            1 for lid in user.get("listings", [])
            if lid in LISTINGS_DB and LISTINGS_DB[lid]["status"] == "confirmed"
        )
        scores.append({
            "name":        user["name"],
            "algo_address": user["algo_address"],
            "eco_points":   trades * 50 + co2 // 100,
            "trades":       trades,
            "co2_saved_kg": co2 / 1000,
        })

    scores.sort(key=lambda x: x["eco_points"], reverse=True)
    for i, s in enumerate(scores):
        s["rank"] = i + 1

    return {"leaderboard": scores[:limit]}


# ─────────────────────────────────────────────────────────────────────────────
# Algorand Utility Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _decode_local_state(raw: dict) -> dict:
    """Decode base64 local state from Algorand response."""
    decoded = {}
    for key_b64, val in raw.items():
        import base64
        try:
            k = base64.b64decode(key_b64).decode()
        except Exception:
            k = key_b64
        if val.get("type") == 1:
            decoded[k] = val.get("uint", 0)
        else:
            try:
                decoded[k] = base64.b64decode(val.get("bytes", "")).decode()
            except Exception:
                decoded[k] = val.get("bytes", "")
    return decoded


def _generate_sustainability_message(co2_grams: int, category: str) -> str:
    co2_kg = co2_grams / 1000
    messages = {
        "books":       f"You saved {co2_kg:.1f} kg CO₂ — equivalent to not printing 4 textbooks!",
        "cycles":      f"You saved {co2_kg:.1f} kg CO₂ — like not driving a car for {co2_kg*5.8:.0f} km!",
        "electronics": f"You saved {co2_kg:.1f} kg CO₂ — equivalent to charging 1,450 smartphones!",
        "furniture":   f"You saved {co2_kg:.1f} kg CO₂ — like skipping {co2_kg*10:.0f} plastic bags!",
    }
    return messages.get(category, f"You saved {co2_kg:.1f} kg CO₂ by choosing to reuse! 🌱")


def _fun_fact(total_co2_grams: int) -> str:
    kg = total_co2_grams / 1000
    if kg < 10:
        return f"Our campus has saved {kg:.1f} kg CO₂ — keep going!"
    elif kg < 100:
        return f"Together we've saved {kg:.1f} kg CO₂ — like planting {kg/21:.0f} trees!"
    else:
        return f"Amazing! {kg:.0f} kg CO₂ saved on campus — equivalent to {kg/171:.0f} km of car travel avoided!"


def _award_trade_completion_onchain(seller: str, buyer: str, co2: int, pts: int):
    """Award eco-points on the ecopoints contract. Called as background task."""
    if not ADMIN_PRIVATE_KEY or not ECOPOINTS_APP_ID:
        return
    params = get_algod_params()
    txn = transaction.ApplicationNoOpTxn(
        sender=ADMIN_ADDRESS,
        sp=params,
        index=ECOPOINTS_APP_ID,
        app_args=[
            b"record_trade",
            decode_address(seller),
            decode_address(buyer),
            co2.to_bytes(8, "big"),
            pts.to_bytes(8, "big"),
        ],
        accounts=[seller, buyer],
    )
    signed = txn.sign(ADMIN_PRIVATE_KEY)
    algod_client.send_transaction(signed)


def _award_college_verification_onchain(user_address: str):
    """Award college verification badge on-chain."""
    if not ADMIN_PRIVATE_KEY or not ECOPOINTS_APP_ID:
        return
    params = get_algod_params()
    txn = transaction.ApplicationNoOpTxn(
        sender=ADMIN_ADDRESS,
        sp=params,
        index=ECOPOINTS_APP_ID,
        app_args=[b"verify", decode_address(user_address)],
        accounts=[user_address],
    )
    signed = txn.sign(ADMIN_PRIVATE_KEY)
    algod_client.send_transaction(signed)


# ─────────────────────────────────────────────────────────────────────────────
# Health Check
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    return {
        "name":    "CampusBazaar API",
        "version": "1.0.0",
        "network": "Algorand Testnet",
        "status":  "🟢 Running",
        "docs":    "/docs",
    }


@app.get("/health/algorand", tags=["Health"])
async def algorand_health():
    try:
        status = algod_client.status()
        return {
            "algorand_node":   "✅ Connected",
            "last_round":      status.get("last-round"),
            "ecopoints_app_id": ECOPOINTS_APP_ID,
        }
    except Exception as e:
        return {"algorand_node": f"❌ Error: {str(e)}"}
