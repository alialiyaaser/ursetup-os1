"""UR SETUP — Premium bilingual gaming accessories brand backend.

Adds: JWT auth, role-based admin, coming-soon products (countdown),
promo banner text CMS, review moderation, newsletter management.
"""
from dotenv import load_dotenv
load_dotenv()

import os
import uuid
import secrets as pysecrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
import httpx
from fastapi import FastAPI, HTTPException, APIRouter, Depends, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
# Legacy roles kept for backward compatibility with the storefront admin panel
ROLES = ("super_admin", "admin", "moderator", "CEO", "Marketing", "Operations", "Tech & Sales", "Support")

# ------ UR SETUP OS role & permission catalog ------
OS_ROLES_DEFAULT = ["CEO", "Marketing", "Operations", "Tech & Sales", "Support", "Pending"]

PERMISSIONS_CATALOG = {
    "dashboard.view": "View dashboard",
    "orders.view": "View orders",
    "orders.manage": "Manage orders",
    "customers.view": "View customers",
    "customers.manage": "Manage customers",
    "products.view": "View products",
    "products.manage": "Manage products",
    "marketing.view": "View marketing",
    "marketing.manage": "Manage marketing",
    "support.view": "View support",
    "support.manage": "Manage support",
    "employees.view": "View employees",
    "employees.manage": "Manage employees",
    "analytics.view": "View analytics",
    "logs.view": "View activity logs (manager only)",
    "settings.view": "View settings",
    "settings.manage": "Manage settings & roles",
    "integrations.manage": "Manage integrations",
    "tasks.assign": "Assign tasks to other employees",
}

DEFAULT_ROLE_PERMS = {
    "CEO": list(PERMISSIONS_CATALOG.keys()),
    "Marketing": ["dashboard.view", "marketing.view", "marketing.manage", "customers.view", "analytics.view"],
    "Operations": ["dashboard.view", "orders.view", "orders.manage", "customers.view", "customers.manage", "products.view"],
    "Tech & Sales": ["dashboard.view", "analytics.view", "products.view", "products.manage", "integrations.manage", "settings.view"],
    "Support": ["dashboard.view", "support.view", "support.manage", "customers.view"],
    "Pending": [],  # brand new users — zero permissions until CEO approves
    # Legacy shims for storefront super_admin
    "super_admin": list(PERMISSIONS_CATALOG.keys()),
    "admin": list(PERMISSIONS_CATALOG.keys()),
    "moderator": ["dashboard.view", "support.view"],
}

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="UR SETUP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------- helpers ----------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = None
    if auth.startswith("Bearer "):
        token = auth[7:].strip()
    if not token:
        token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user = None
    # Try our JWT first
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        if payload.get("type") == "access":
            user = await db.users.find_one({"id": payload["sub"]})
    except jwt.PyJWTError:
        user = None
    # Fallback: Emergent session_token
    if not user:
        sess = await db.user_sessions.find_one({"session_token": token})
        if sess:
            expires = sess.get("expires_at")
            if isinstance(expires, str):
                try:
                    expires = datetime.fromisoformat(expires)
                except Exception:
                    expires = None
            if expires and expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if not expires or expires >= datetime.now(timezone.utc):
                user = await db.users.find_one({"id": sess["user_id"]})

    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    # Track presence
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_seen": _now_iso(), "status": "online"}},
    )
    user.pop("_id", None)
    user.pop("password_hash", None)
    return user


def require_role(*roles: str):
    # CEO always allowed (top of org).
    allowed = set(roles) | {"CEO"}
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


# ---------------------- Models ----------------------
class ReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    country: Optional[str] = Field(default=None, max_length=60)
    product: str = Field(min_length=1, max_length=80)
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = Field(default=None, max_length=120)
    comment: str = Field(min_length=3, max_length=1000)
    language: str = Field(default="en")

    @field_validator("language")
    @classmethod
    def _lang(cls, v: str) -> str:
        return v if v in ("en", "ar") else "en"


class Review(ReviewIn):
    id: str
    verified: bool = False
    hidden: bool = False
    created_at: str


class NewsletterIn(BaseModel):
    email: EmailStr
    language: str = Field(default="en")


class NewsletterOut(BaseModel):
    id: str
    email: EmailStr
    created_at: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="moderator")

    @field_validator("role")
    @classmethod
    def _r(cls, v: str) -> str:
        if v not in ROLES:
            raise ValueError("invalid role")
        return v


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ComingSoonIn(BaseModel):
    name_en: str = Field(min_length=1, max_length=120)
    name_ar: str = Field(min_length=1, max_length=120)
    desc_en: Optional[str] = Field(default="", max_length=400)
    desc_ar: Optional[str] = Field(default="", max_length=400)
    image: str = Field(min_length=1, max_length=500)  # URL
    launch_at: str  # ISO datetime
    active: bool = True


class ComingSoon(ComingSoonIn):
    id: str
    created_at: str


class PromoBannerIn(BaseModel):
    text_en: str = Field(default="", max_length=200)
    text_ar: str = Field(default="", max_length=200)
    link: Optional[str] = Field(default=None, max_length=500)
    active: bool = True


# ---------------------- Public routes ----------------------
@api.get("/")
async def root():
    return {"service": "UR SETUP API", "status": "ok"}


@api.get("/reviews", response_model=List[Review])
async def list_reviews(product: Optional[str] = None, limit: int = 50):
    query: dict = {"hidden": {"$ne": True}}
    if product:
        query["product"] = product
    cursor = db.reviews.find(query).sort("created_at", -1).limit(min(limit, 200))
    out: List[Review] = []
    async for doc in cursor:
        doc.pop("_id", None)
        doc.setdefault("hidden", False)
        out.append(Review(**doc))
    return out


@api.post("/reviews", response_model=Review, status_code=201)
async def create_review(payload: ReviewIn):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["verified"] = False
    doc["hidden"] = False
    doc["created_at"] = _now_iso()
    await db.reviews.insert_one(dict(doc))
    doc.pop("_id", None)
    return Review(**doc)


@api.get("/reviews/summary")
async def reviews_summary(product: Optional[str] = None):
    match_stage: dict = {"hidden": {"$ne": True}}
    if product:
        match_stage["product"] = product
    pipeline = [
        {"$match": match_stage},
        {
            "$group": {
                "_id": None,
                "count": {"$sum": 1},
                "avg": {"$avg": "$rating"},
                "five": {"$sum": {"$cond": [{"$eq": ["$rating", 5]}, 1, 0]}},
                "four": {"$sum": {"$cond": [{"$eq": ["$rating", 4]}, 1, 0]}},
                "three": {"$sum": {"$cond": [{"$eq": ["$rating", 3]}, 1, 0]}},
                "two": {"$sum": {"$cond": [{"$eq": ["$rating", 2]}, 1, 0]}},
                "one": {"$sum": {"$cond": [{"$eq": ["$rating", 1]}, 1, 0]}},
            }
        },
    ]
    result = await db.reviews.aggregate(pipeline).to_list(length=1)
    if not result:
        return {"count": 0, "average": 0.0, "breakdown": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}}
    r = result[0]
    return {
        "count": r["count"],
        "average": round(r["avg"] or 0, 2),
        "breakdown": {"5": r["five"], "4": r["four"], "3": r["three"], "2": r["two"], "1": r["one"]},
    }


@api.post("/newsletter", response_model=NewsletterOut, status_code=201)
async def subscribe_newsletter(payload: NewsletterIn):
    existing = await db.newsletter.find_one({"email": payload.email})
    if existing:
        existing.pop("_id", None)
        return NewsletterOut(**existing)
    doc = {
        "id": str(uuid.uuid4()),
        "email": payload.email,
        "language": payload.language,
        "created_at": _now_iso(),
    }
    await db.newsletter.insert_one(dict(doc))
    doc.pop("_id", None)
    return NewsletterOut(**doc)


@api.get("/stats")
async def get_stats():
    summary_doc = await db.reviews.aggregate(
        [{"$match": {"hidden": {"$ne": True}}}, {"$group": {"_id": None, "count": {"$sum": 1}, "avg": {"$avg": "$rating"}}}]
    ).to_list(length=1)
    if summary_doc:
        s = summary_doc[0]
        reviews_count = s["count"]
        avg = round(s["avg"] or 5.0, 2)
    else:
        reviews_count = 0
        avg = 5.0
    meta = await db.meta.find_one({"key": "counters"}) or {}
    return {
        "customers": meta.get("customers", 250),
        "orders": meta.get("orders", 500),
        "reviews_count": reviews_count,
        "average_rating": avg if reviews_count else 4.9,
    }


@api.post("/contact")
async def contact_submit(payload: dict):
    name = str(payload.get("name", "")).strip()
    email = str(payload.get("email", "")).strip()
    message = str(payload.get("message", "")).strip()
    if not (name and email and message):
        raise HTTPException(status_code=400, detail="missing fields")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name[:120],
        "email": email[:200],
        "message": message[:2000],
        "created_at": _now_iso(),
    }
    await db.contacts.insert_one(dict(doc))
    return {"ok": True, "id": doc["id"]}


@api.get("/coming-soon", response_model=List[ComingSoon])
async def list_coming_soon_public():
    cursor = db.coming_soon.find({"active": True}).sort("launch_at", 1)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(ComingSoon(**doc))
    return out


@api.get("/promo-banner")
async def get_promo_banner_public():
    doc = await db.settings.find_one({"key": "promo_banner"})
    if not doc:
        return {"text_en": "", "text_ar": "", "link": None, "active": False}
    doc.pop("_id", None)
    doc.pop("key", None)
    return doc


# ---------------------- Auth routes ----------------------
@auth_router.post("/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "created_at": user["created_at"],
        },
    }


@auth_router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(get_current_user)):
    return UserPublic(**user)


@auth_router.post("/change-password")
async def change_password(payload: PasswordChange, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if not full or not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"ok": True}


# ---------------------- Admin routes ----------------------
@admin_router.get("/overview")
async def admin_overview(_: dict = Depends(require_role("super_admin", "admin", "moderator"))):
    users_count = await db.users.count_documents({})
    reviews_count = await db.reviews.count_documents({})
    pending_reviews = await db.reviews.count_documents({"verified": False, "hidden": {"$ne": True}})
    hidden_reviews = await db.reviews.count_documents({"hidden": True})
    newsletter_count = await db.newsletter.count_documents({})
    contacts_count = await db.contacts.count_documents({})
    coming_soon_count = await db.coming_soon.count_documents({})
    return {
        "users": users_count,
        "reviews": reviews_count,
        "pending_reviews": pending_reviews,
        "hidden_reviews": hidden_reviews,
        "newsletter": newsletter_count,
        "contacts": contacts_count,
        "coming_soon": coming_soon_count,
    }


# ----- Reviews moderation -----
@admin_router.get("/reviews")
async def admin_list_reviews(_: dict = Depends(require_role("super_admin", "admin", "moderator"))):
    cursor = db.reviews.find({}).sort("created_at", -1).limit(300)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        doc.setdefault("hidden", False)
        out.append(doc)
    return out


@admin_router.patch("/reviews/{rid}")
async def admin_update_review(
    rid: str,
    payload: dict,
    _: dict = Depends(require_role("super_admin", "admin", "moderator")),
):
    allowed = {"verified", "hidden"}
    updates = {k: bool(v) for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No allowed fields to update")
    r = await db.reviews.update_one({"id": rid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"ok": True}


@admin_router.delete("/reviews/{rid}")
async def admin_delete_review(
    rid: str,
    _: dict = Depends(require_role("super_admin", "admin")),
):
    r = await db.reviews.delete_one({"id": rid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"ok": True}


# ----- Coming Soon -----
@admin_router.get("/coming-soon")
async def admin_list_cs(_: dict = Depends(require_role("super_admin", "admin"))):
    cursor = db.coming_soon.find({}).sort("launch_at", 1)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


@admin_router.post("/coming-soon", response_model=ComingSoon, status_code=201)
async def admin_create_cs(payload: ComingSoonIn, _: dict = Depends(require_role("super_admin", "admin"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = _now_iso()
    await db.coming_soon.insert_one(dict(doc))
    doc.pop("_id", None)
    return ComingSoon(**doc)


@admin_router.patch("/coming-soon/{cid}")
async def admin_update_cs(cid: str, payload: dict, _: dict = Depends(require_role("super_admin", "admin"))):
    allowed = {"name_en", "name_ar", "desc_en", "desc_ar", "image", "launch_at", "active"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No allowed fields")
    r = await db.coming_soon.update_one({"id": cid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@admin_router.delete("/coming-soon/{cid}")
async def admin_delete_cs(cid: str, _: dict = Depends(require_role("super_admin", "admin"))):
    r = await db.coming_soon.delete_one({"id": cid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


# ----- Promo banner -----
@admin_router.get("/promo-banner")
async def admin_get_promo(_: dict = Depends(require_role("super_admin", "admin"))):
    doc = await db.settings.find_one({"key": "promo_banner"})
    if not doc:
        return {"text_en": "", "text_ar": "", "link": None, "active": False}
    doc.pop("_id", None)
    doc.pop("key", None)
    return doc


@admin_router.put("/promo-banner")
async def admin_set_promo(payload: PromoBannerIn, _: dict = Depends(require_role("super_admin", "admin"))):
    doc = payload.model_dump()
    await db.settings.update_one(
        {"key": "promo_banner"},
        {"$set": {"key": "promo_banner", **doc}},
        upsert=True,
    )
    return {"ok": True, **doc}


# ----- Newsletter -----
@admin_router.get("/newsletter")
async def admin_list_newsletter(_: dict = Depends(require_role("super_admin", "admin"))):
    cursor = db.newsletter.find({}).sort("created_at", -1).limit(500)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


# ----- Users (super_admin only) -----
@admin_router.get("/users", response_model=List[UserPublic])
async def admin_list_users(_: dict = Depends(require_role("super_admin"))):
    cursor = db.users.find({}).sort("created_at", -1).limit(500)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        doc.pop("password_hash", None)
        out.append(UserPublic(**doc))
    return out


@admin_router.post("/users", response_model=UserPublic, status_code=201)
async def admin_create_user(payload: UserCreate, _: dict = Depends(require_role("super_admin"))):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "role": payload.role,
        "password_hash": hash_password(payload.password),
        "created_at": _now_iso(),
    }
    await db.users.insert_one(dict(doc))
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return UserPublic(**doc)


@admin_router.patch("/users/{uid}")
async def admin_update_user(uid: str, payload: dict, current: dict = Depends(require_role("super_admin"))):
    allowed = {"name", "role", "password"}
    updates: dict = {}
    for k, v in payload.items():
        if k not in allowed:
            continue
        if k == "role" and v not in ROLES:
            raise HTTPException(status_code=400, detail="invalid role")
        if k == "password":
            if len(v) < 8:
                raise HTTPException(status_code=400, detail="password too short")
            updates["password_hash"] = hash_password(v)
        else:
            updates[k] = v
    if not updates:
        raise HTTPException(status_code=400, detail="No allowed fields")
    r = await db.users.update_one({"id": uid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@admin_router.delete("/users/{uid}")
async def admin_delete_user(uid: str, current: dict = Depends(require_role("super_admin"))):
    if uid == current["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    r = await db.users.delete_one({"id": uid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------------------- Seed ----------------------
SEED_REVIEWS = [
    {"name": "Faisal A.", "country": "SA", "product": "dark-marble", "rating": 5,
     "title": "Museum-grade quality", "comment": "The stitching, the texture — feels like a luxury item. Ships fast in Riyadh.", "language": "en"},
    {"name": "Layla K.", "country": "AE", "product": "white-marble", "rating": 5,
     "title": "قطعة فنية", "comment": "الخامة فخمة جداً، ملمس الرخام حقيقي. غيّرت شكل مكتبي بالكامل.", "language": "ar"},
    {"name": "Marcus R.", "country": "DE", "product": "grey-marble", "rating": 5,
     "title": "Better than premium brands", "comment": "I own Razer and Logitech pads — this one glides smoother and looks 10x better.", "language": "en"},
    {"name": "Omar S.", "country": "SA", "product": "dark-marble", "rating": 4,
     "title": "ممتاز", "comment": "جودة ممتازة والشحن سريع. أنصح فيه بشدة.", "language": "ar"},
    {"name": "Sophie L.", "country": "FR", "product": "white-marble", "rating": 5,
     "title": "Editorial-worthy", "comment": "It photographs beautifully. My whole setup looks curated now.", "language": "en"},
    {"name": "Abdullah M.", "country": "SA", "product": "grey-marble", "rating": 5,
     "title": "فخامة سعودية", "comment": "براند سعودي يستاهل. الرخام الرمادي بشكل احترافي مذهل.", "language": "ar"},
]


@app.on_event("startup")
async def seed():
    await _ensure_indexes()
    await _seed_reviews()
    await _seed_meta_counters()
    await _seed_super_admin()
    await _seed_coming_soon()
    await _seed_promo_banner()


async def _ensure_indexes() -> None:
    await db.users.create_index("email", unique=True)
    await db.reviews.create_index("created_at")
    await db.newsletter.create_index("email", unique=True)


async def _seed_reviews() -> None:
    if await db.reviews.count_documents({}) == 0:
        docs = [
            {**r, "id": str(uuid.uuid4()), "verified": True, "hidden": False, "created_at": _now_iso()}
            for r in SEED_REVIEWS
        ]
        await db.reviews.insert_many(docs)
    # Safe migration: ensure hidden field on all existing reviews
    await db.reviews.update_many({"hidden": {"$exists": False}}, {"$set": {"hidden": False}})


async def _seed_meta_counters() -> None:
    await db.meta.update_one(
        {"key": "counters"},
        {"$setOnInsert": {"key": "counters", "customers": 250, "orders": 500}},
        upsert=True,
    )


async def _seed_super_admin() -> None:
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@ursetup.sa").lower().strip()
    admin_password = os.environ.get("ADMIN_PASSWORD", "URSetup@2026!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Super Admin",
            "role": "super_admin",
            "password_hash": hash_password(admin_password),
            "created_at": _now_iso(),
        })
        return
    if not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "super_admin"}},
        )


async def _seed_coming_soon() -> None:
    if await db.coming_soon.count_documents({}) > 0:
        return
    launch = (datetime.now(timezone.utc) + timedelta(days=21)).isoformat()
    await db.coming_soon.insert_one({
        "id": str(uuid.uuid4()),
        "name_en": "The Obsidian XL",
        "name_ar": "أوبسيديان XL",
        "desc_en": "An oversized dark-marble mousepad for full-desk immersion. Precision-stitched, low-friction.",
        "desc_ar": "ماوس باد رخامي داكن بحجم كبير لتغطية مكتبك بالكامل. حواف مخيطة بدقة، احتكاك منخفض.",
        "image": "https://images.unsplash.com/photo-1650804068570-7fb2e3dbf888?crop=entropy&cs=srgb&fm=jpg&w=1600&q=85",
        "launch_at": launch,
        "active": True,
        "created_at": _now_iso(),
    })


async def _seed_promo_banner() -> None:
    if await db.settings.find_one({"key": "promo_banner"}):
        return
    await db.settings.insert_one({
        "key": "promo_banner",
        "text_en": "Free delivery across KSA — Marble XL series coming soon",
        "text_ar": "شحن مجاني داخل المملكة — سلسلة الرخام XL قريبًا",
        "link": "#coming-soon",
        "active": True,
    })


app.include_router(api)
app.include_router(auth_router)
app.include_router(admin_router)


# =============================================================================
# UR SETUP OS — Internal Company Operating System
# =============================================================================
os_router = APIRouter(prefix="/api/os", tags=["os"])


def _perms_for(user: dict):
    # If user has an explicit permissions array, use it (even if empty — means zero perms)
    if "permissions" in user and user["permissions"] is not None:
        # If the array is empty AND the role has defaults, fall through to role defaults
        # ONLY when the user has never been "customized". We detect this via `permissions_customized` flag.
        if user["permissions"] or user.get("permissions_customized"):
            return list(user["permissions"])
    return DEFAULT_ROLE_PERMS.get(user.get("role", ""), [])


def require_perm(*perms: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        user_perms = set(_perms_for(user))
        if not any(p in user_perms for p in perms):
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


async def log_activity(user: dict, action: str, module: str,
                       target: Optional[str] = None, meta: Optional[dict] = None):
    await db.activity_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user.get("id"),
        "user_name": user.get("name"),
        "user_email": user.get("email"),
        "role": user.get("role"),
        "action": action,
        "module": module,
        "target": target,
        "meta": meta or {},
        "created_at": _now_iso(),
    })


# ------ OS Models ------
class OSEmployeeCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=80)
    role: str = Field(default="Support")
    language: Literal["ar", "en"] = "ar"
    permissions: Optional[List[str]] = None


class OSEmployeeUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    permissions: Optional[List[str]] = None
    language: Optional[Literal["ar", "en"]] = None
    password: Optional[str] = None


class OSPreferences(BaseModel):
    language: Optional[Literal["ar", "en"]] = None
    theme: Optional[Literal["light", "dark"]] = None


class OSTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    assigned_to: Optional[str] = None
    due_at: Optional[str] = None


class OSTaskUpdate(BaseModel):
    title: Optional[str] = None
    done: Optional[bool] = None
    assigned_to: Optional[str] = None
    due_at: Optional[str] = None


class OSRoleUpsert(BaseModel):
    permissions: List[str]
    description: Optional[str] = ""


class OSIntegrationUpsert(BaseModel):
    key: Literal["salla", "whatsapp", "email"]
    enabled: bool = True
    credentials: dict = Field(default_factory=dict)  # e.g. {"access_token": "...", "store_id": "..."}


# ------ Auth (OS extensions) ------
@os_router.get("/me")
async def os_me(user: dict = Depends(get_current_user)):
    return {**user, "permissions_effective": _perms_for(user)}


@os_router.patch("/preferences")
async def os_prefs(payload: OSPreferences, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        await log_activity(user, "preferences_updated", "settings", meta=updates)
    fresh = await db.users.find_one({"id": user["id"]})
    fresh.pop("_id", None); fresh.pop("password_hash", None)
    return {**fresh, "permissions_effective": _perms_for(fresh)}


@os_router.post("/auth/google/session")
async def os_google_session(request: Request, response: Response):
    """Exchange Emergent Google Auth session_id for an internal session + JWT."""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        try:
            body = await request.json()
        except Exception:
            body = {}
        session_id = (body or {}).get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    async with httpx.AsyncClient(timeout=10) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google session")
    data = r.json()
    email = (data.get("email") or "").lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Session missing email")

    existing = await db.users.find_one({"email": email})
    if existing is None:
        # SECURITY: New Google sign-ins get ZERO permissions. CEO must approve.
        new_user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "name": data.get("name") or email.split("@")[0],
            "picture": data.get("picture"),
            "role": "Pending",
            "permissions": [],
            "permissions_customized": True,  # lock at zero until CEO changes it
            "language": "ar",
            "theme": "dark",
            "auth_provider": "google",
            "status": "online",
            "last_seen": _now_iso(),
            "created_at": _now_iso(),
        }
        await db.users.insert_one(new_user)
        user = new_user
    else:
        await db.users.update_one(
            {"email": email},
            {"$set": {"picture": data.get("picture") or existing.get("picture"),
                      "status": "online", "last_seen": _now_iso()}},
        )
        user = await db.users.find_one({"email": email})

    st = data.get("session_token")
    if st:
        await db.user_sessions.update_one(
            {"session_token": st},
            {"$set": {"user_id": user["id"], "session_token": st,
                      "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)),
                      "created_at": _now_iso()}},
            upsert=True,
        )
        response.set_cookie(key="session_token", value=st, httponly=True,
                            secure=True, samesite="none", max_age=7*24*3600, path="/")

    jwt_token = create_access_token(user["id"], user["email"], user["role"])
    await log_activity(user, "logged_in_google", "auth")
    user.pop("_id", None); user.pop("password_hash", None)
    return {"access_token": jwt_token, "token_type": "bearer",
            "user": {**user, "permissions_effective": _perms_for(user)}}


# ------ Employees ------
@os_router.get("/employees")
async def os_list_employees(_: dict = Depends(require_perm("employees.view"))):
    cursor = db.users.find({}).sort("created_at", -1).limit(500)
    out = []
    async for doc in cursor:
        doc.pop("_id", None); doc.pop("password_hash", None)
        out.append(doc)
    return out


@os_router.post("/employees", status_code=201)
async def os_create_employee(payload: OSEmployeeCreate,
                             actor: dict = Depends(require_perm("employees.manage"))):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "role": payload.role,
        "permissions": payload.permissions or [],
        "language": payload.language,
        "theme": "dark",
        "password_hash": hash_password(payload.password),
        "auth_provider": "password",
        "status": "offline",
        "last_seen": None,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(dict(doc))
    await log_activity(actor, "employee_created", "employees", target=doc["id"],
                       meta={"email": email, "role": doc["role"]})
    doc.pop("_id", None); doc.pop("password_hash", None)
    return doc


@os_router.patch("/employees/{uid}")
async def os_update_employee(uid: str, payload: OSEmployeeUpdate,
                             actor: dict = Depends(require_perm("employees.manage"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "password" in updates:
        pwd = updates.pop("password")
        if len(pwd) < 6:
            raise HTTPException(status_code=400, detail="Password too short")
        updates["password_hash"] = hash_password(pwd)
    # Track whether the CALLER explicitly requested a permissions change
    caller_set_perms = "permissions" in updates
    if caller_set_perms:
        invalid = [p for p in updates["permissions"] if p not in PERMISSIONS_CATALOG]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid}")
        updates["permissions_customized"] = True
    # If a role change is requested WITHOUT explicit permissions, reset to role defaults
    if "role" in updates and not caller_set_perms:
        updates["permissions"] = []
        updates["permissions_customized"] = False
    if not updates:
        raise HTTPException(status_code=400, detail="No fields")
    r = await db.users.update_one({"id": uid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_activity(actor, "employee_updated", "employees", target=uid,
                       meta={"fields": list(updates.keys())})
    return {"ok": True}


@os_router.delete("/employees/{uid}")
async def os_delete_employee(uid: str,
                             actor: dict = Depends(require_perm("employees.manage"))):
    if uid == actor["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    r = await db.users.delete_one({"id": uid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_activity(actor, "employee_deleted", "employees", target=uid)
    return {"ok": True}


# ------ Roles ------
@os_router.get("/roles")
async def os_list_roles(_: dict = Depends(get_current_user)):
    cursor = db.roles.find({}).sort("name", 1).limit(100)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return {"roles": out, "permissions_catalog": PERMISSIONS_CATALOG,
            "default_role_perms": DEFAULT_ROLE_PERMS}


@os_router.put("/roles/{name}")
async def os_upsert_role(name: str, payload: OSRoleUpsert,
                         actor: dict = Depends(require_perm("settings.manage"))):
    invalid = [p for p in payload.permissions if p not in PERMISSIONS_CATALOG]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {invalid}")
    await db.roles.update_one(
        {"name": name},
        {"$set": {"name": name, "permissions": payload.permissions,
                  "description": payload.description or "",
                  "updated_at": _now_iso()},
         "$setOnInsert": {"created_at": _now_iso()}},
        upsert=True,
    )
    await log_activity(actor, "role_upserted", "settings", target=name,
                       meta={"perms_count": len(payload.permissions)})
    return {"ok": True}


@os_router.delete("/roles/{name}")
async def os_delete_role(name: str,
                         actor: dict = Depends(require_perm("settings.manage"))):
    if name in OS_ROLES_DEFAULT:
        raise HTTPException(status_code=400, detail="Cannot delete default role")
    r = await db.roles.delete_one({"name": name})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_activity(actor, "role_deleted", "settings", target=name)
    return {"ok": True}


# ------ Activity Logs (CEO / logs.view only) ------
@os_router.get("/activity-logs")
async def os_list_logs(limit: int = 100,
                       _: dict = Depends(require_perm("logs.view"))):
    cursor = db.activity_logs.find({}).sort("created_at", -1).limit(min(limit, 500))
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


# ------ Tasks ------
@os_router.get("/tasks")
async def os_list_tasks(user: dict = Depends(get_current_user)):
    query = {"$or": [{"assigned_to": user["id"]}, {"created_by": user["id"]}]}
    cursor = db.tasks.find(query).sort("created_at", -1).limit(200)
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


@os_router.post("/tasks", status_code=201)
async def os_create_task(payload: OSTaskCreate, user: dict = Depends(get_current_user)):
    # Anyone can create a task for themselves. To assign to another user requires tasks.assign.
    assigned_to = payload.assigned_to or user["id"]
    if assigned_to != user["id"] and "tasks.assign" not in _perms_for(user):
        raise HTTPException(status_code=403, detail="You cannot assign tasks to other employees")
    doc = {
        "id": str(uuid.uuid4()),
        "title": payload.title,
        "assigned_to": assigned_to,
        "created_by": user["id"],
        "due_at": payload.due_at,
        "done": False,
        "created_at": _now_iso(),
    }
    await db.tasks.insert_one(dict(doc))
    await log_activity(user, "task_created", "tasks", target=doc["id"],
                       meta={"title": payload.title, "assigned_to": assigned_to})
    doc.pop("_id", None)
    return doc


@os_router.get("/employees/lookup")
async def os_employees_lookup(user: dict = Depends(get_current_user)):
    """Minimal employee list for task assignment (name + id only). Any authed user."""
    cursor = db.users.find({}, {"id": 1, "name": 1, "role": 1, "_id": 0}).sort("name", 1)
    return [doc async for doc in cursor]


@os_router.patch("/tasks/{tid}")
async def os_update_task(tid: str, payload: OSTaskUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields")
    r = await db.tasks.update_one({"id": tid}, {"$set": updates})
    if r.matched_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    if updates.get("done"):
        await log_activity(user, "task_completed", "tasks", target=tid)
    return {"ok": True}


@os_router.delete("/tasks/{tid}")
async def os_delete_task(tid: str, user: dict = Depends(get_current_user)):
    r = await db.tasks.delete_one({"id": tid})
    if r.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await log_activity(user, "task_deleted", "tasks", target=tid)
    return {"ok": True}


# ------ Dashboard ------
@os_router.get("/dashboard/summary")
async def os_dashboard_summary(user: dict = Depends(require_perm("dashboard.view"))):
    total_employees = await db.users.count_documents({})
    online_employees = await db.users.count_documents({"status": "online"})
    pending_tasks = await db.tasks.count_documents({"assigned_to": user["id"], "done": False})
    # Reuse storefront metrics as “placeholder” data
    reviews_count = await db.reviews.count_documents({})
    newsletter_count = await db.newsletter.count_documents({})
    contacts_count = await db.contacts.count_documents({})
    return {
        "orders_today": 0,
        "revenue_today": 0,
        "new_customers": 0,
        "pending_orders": 0,
        "total_employees": total_employees,
        "online_employees": online_employees,
        "pending_tasks": pending_tasks,
        "reviews_count": reviews_count,
        "newsletter_count": newsletter_count,
        "contacts_count": contacts_count,
        "integrations": {
            "salla": "not_connected",
            "whatsapp": "not_connected",
            "email": "not_connected",
        },
    }


@os_router.get("/dashboard/online-employees")
async def os_online_employees(_: dict = Depends(require_perm("logs.view"))):
    """Only managers (logs.view = CEO) can see who's online."""
    cursor = db.users.find({"status": "online"}).sort("last_seen", -1).limit(200)
    out = []
    async for doc in cursor:
        doc.pop("_id", None); doc.pop("password_hash", None)
        out.append(doc)
    return out


@os_router.get("/dashboard/recent-activity")
async def os_recent_activity(limit: int = 8, user: dict = Depends(get_current_user)):
    query = {} if "logs.view" in _perms_for(user) else {"user_id": user["id"]}
    cursor = db.activity_logs.find(query).sort("created_at", -1).limit(min(limit, 50))
    out = []
    async for doc in cursor:
        doc.pop("_id", None)
        out.append(doc)
    return out


@os_router.get("/permissions-catalog")
async def os_perms_catalog(_: dict = Depends(get_current_user)):
    return {"catalog": PERMISSIONS_CATALOG, "default_role_perms": DEFAULT_ROLE_PERMS,
            "default_roles": OS_ROLES_DEFAULT}


# ------ Startup extension: seed OS ------
@app.on_event("startup")
async def _seed_os():
    await db.activity_logs.create_index("created_at")
    await db.activity_logs.create_index("user_id")
    await db.tasks.create_index("assigned_to")
    await db.user_sessions.create_index("session_token", unique=True)
    await db.roles.create_index("name", unique=True)

    for role_name in OS_ROLES_DEFAULT:
        await db.roles.update_one(
            {"name": role_name},
            {"$set": {"name": role_name,
                      "permissions": DEFAULT_ROLE_PERMS.get(role_name, []),
                      "updated_at": _now_iso()},
             "$setOnInsert": {"created_at": _now_iso(),
                              "description": f"Default {role_name} role"}},
            upsert=True,
        )

    # Ensure the seeded super_admin is elevated to CEO with all OS permissions
    admin_email = os.environ.get("ADMIN_EMAIL", "ceo@ursetup.com").lower().strip()
    await db.users.update_one(
        {"email": admin_email},
        {"$set": {"role": "CEO",
                  "permissions": list(PERMISSIONS_CATALOG.keys()),
                  "language": "ar",
                  "theme": "dark"}},
    )


app.include_router(os_router)


# =============================================================================
# UR SETUP OS — Integrations
# =============================================================================
integrations_router = APIRouter(prefix="/api/os/integrations", tags=["integrations"])


def _mask_creds(creds: dict) -> dict:
    """Return credentials with sensitive values masked (only last 4 chars visible)."""
    out = {}
    for k, v in (creds or {}).items():
        if isinstance(v, str) and len(v) > 4 and any(s in k.lower() for s in ("token", "secret", "key", "password")):
            out[k] = "•" * 8 + v[-4:]
        else:
            out[k] = v
    return out


@integrations_router.get("")
async def list_integrations(_: dict = Depends(get_current_user)):
    cursor = db.integrations.find({}).limit(50)
    known = {"salla", "whatsapp", "email"}
    saved = {}
    async for doc in cursor:
        doc.pop("_id", None)
        doc["credentials"] = _mask_creds(doc.get("credentials", {}))
        saved[doc["key"]] = doc
    # Ensure all known integrations appear
    for k in known:
        if k not in saved:
            saved[k] = {"key": k, "enabled": False, "credentials": {}, "status": "not_connected"}
    return list(saved.values())


@integrations_router.put("/{key}")
async def upsert_integration(key: str, payload: OSIntegrationUpsert,
                             actor: dict = Depends(require_perm("integrations.manage"))):
    if key != payload.key:
        raise HTTPException(status_code=400, detail="Key mismatch")
    now = _now_iso()
    await db.integrations.update_one(
        {"key": key},
        {"$set": {"key": key, "enabled": payload.enabled,
                  "credentials": payload.credentials,
                  "status": "connected" if payload.enabled and payload.credentials else "not_connected",
                  "updated_at": now},
         "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    await log_activity(actor, "integration_upserted", "integrations", target=key,
                       meta={"enabled": payload.enabled})
    return {"ok": True}


@integrations_router.delete("/{key}")
async def delete_integration(key: str,
                             actor: dict = Depends(require_perm("integrations.manage"))):
    await db.integrations.delete_one({"key": key})
    await log_activity(actor, "integration_deleted", "integrations", target=key)
    return {"ok": True}


app.include_router(integrations_router)
