"""UR SETUP OS — Extended features (heartbeat, HR, Social, Chat, Calendar, Files,
Applications, Notifications, Reports, AI, Search).

This module is imported by server.py at the end to append endpoints without
touching the existing legacy code. Uses the same DB, JWT, and role guards.
"""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Optional, Dict, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, EmailStr

# Imported from server module at wiring time
_deps = {}

def wire(app, db, get_current_user, require_perm, log_activity, hash_password,
         PERMISSIONS_CATALOG, DEFAULT_ROLE_PERMS, OS_ROLES_DEFAULT, _now_iso):
    """Attach all extended endpoints to the given FastAPI app."""
    _deps.update(dict(
        db=db, get_current_user=get_current_user, require_perm=require_perm,
        log_activity=log_activity, hash_password=hash_password,
        PERMISSIONS_CATALOG=PERMISSIONS_CATALOG, DEFAULT_ROLE_PERMS=DEFAULT_ROLE_PERMS,
        OS_ROLES_DEFAULT=OS_ROLES_DEFAULT, now_iso=_now_iso,
    ))

    UPLOAD_DIR = Path(__file__).parent / "uploads"
    UPLOAD_DIR.mkdir(exist_ok=True)
    EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

    ext = APIRouter(prefix="/api/os", tags=["os-ext"])
    pub = APIRouter(prefix="/api", tags=["public-ext"])

    # --- Models ---
    class HeartbeatOut(BaseModel):
        ok: bool = True
        last_seen: str

    class AttendanceIn(BaseModel):
        action: Literal["check_in", "check_out"]

    class LeaveIn(BaseModel):
        user_id: Optional[str] = None
        from_date: str
        to_date: str
        reason: str = ""
        type: str = "annual"

    class PayrollIn(BaseModel):
        user_id: str
        month: str
        base: float
        bonus: float = 0
        deduction: float = 0

    class EvaluationIn(BaseModel):
        user_id: str
        month: str
        score: int = Field(ge=1, le=10)
        notes: str = ""

    class StatusIn(BaseModel):
        status: str

    class TaskFull(BaseModel):
        title: str
        description: str = ""
        assigned_to: Optional[str] = None
        priority: Literal["low", "medium", "high", "urgent"] = "medium"
        due_at: Optional[str] = None
        progress: int = 0
        status: Literal["todo", "in_progress", "done"] = "todo"

    class TaskCommentIn(BaseModel):
        text: str

    class EventIn(BaseModel):
        title: str
        description: str = ""
        date: str
        type: Literal["meeting", "campaign", "holiday", "launch"] = "meeting"
        attendees: List[str] = []

    class ChannelIn(BaseModel):
        name: str
        type: Literal["public", "group", "dm"] = "group"
        members: List[str] = []

    class MessageIn(BaseModel):
        channel_id: str
        text: str
        file_url: Optional[str] = None

    class SocialPostIn(BaseModel):
        platform: Literal["tiktok", "instagram", "snapchat", "x"]
        content: str
        media_url: Optional[str] = None
        scheduled_at: Optional[str] = None
        assigned_to: Optional[str] = None
        status: Literal["draft", "scheduled", "published"] = "draft"

    class AIGenIn(BaseModel):
        prompt: str = Field(min_length=1, max_length=8000)
        context: Optional[str] = None

    class RolesIn(BaseModel):
        roles: List[str]

    # --- Heartbeat & Multi-role ---
    @ext.post("/heartbeat", response_model=HeartbeatOut)
    async def heartbeat(user: dict = Depends(get_current_user)):
        now = _now_iso()
        await db.users.update_one({"id": user["id"]},
            {"$set": {"status": "online", "last_seen": now}})
        return HeartbeatOut(ok=True, last_seen=now)

    @ext.post("/logout")
    async def logout_ext(user: dict = Depends(get_current_user)):
        await db.users.update_one({"id": user["id"]},
            {"$set": {"status": "offline", "last_seen": _now_iso()}})
        return {"ok": True}

    @ext.get("/online-scan")
    async def online_scan(user: dict = Depends(get_current_user)):
        """Auto-flip idle users (last_seen > 2min) to offline. Called by clients periodically."""
        threshold = (datetime.now(timezone.utc) - timedelta(minutes=2)).isoformat()
        await db.users.update_many(
            {"status": "online", "last_seen": {"$lt": threshold}},
            {"$set": {"status": "offline"}},
        )
        return {"ok": True}

    @ext.patch("/employees/{uid}/roles")
    async def set_roles(uid: str, payload: RolesIn,
                        actor: dict = Depends(require_perm("employees.manage"))):
        """Assign multiple roles to a user. Primary role becomes roles[0]."""
        if not payload.roles:
            raise HTTPException(400, "At least one role required")
        primary = payload.roles[0]
        # Collect permissions from all roles
        perms = set()
        for r in payload.roles:
            perms.update(DEFAULT_ROLE_PERMS.get(r, []))
        await db.users.update_one({"id": uid}, {"$set": {
            "role": primary, "roles": payload.roles,
            "permissions": list(perms), "permissions_customized": False,
        }})
        await log_activity(actor, "roles_updated", "employees", target=uid,
                           meta={"roles": payload.roles})
        return {"ok": True}

    class BonusIn(BaseModel):
        user_id: str
        amount: float
        reason: str = ""
        month: str = ""

    class DeductionIn(BaseModel):
        user_id: str
        amount: float
        reason: str = ""
        month: str = ""

    class PromotionIn(BaseModel):
        user_id: str
        from_role: str = ""
        to_role: str
        effective_date: str
        salary_change: float = 0
        notes: str = ""

    class PenaltyIn(BaseModel):
        user_id: str
        type: Literal["warning", "fine", "suspension", "termination"] = "warning"
        severity: Literal["low", "medium", "high"] = "low"
        reason: str
        amount: float = 0
        expires_at: Optional[str] = None

    class PositionIn(BaseModel):
        title: str
        department: str = ""
        description: str = ""
        requirements: str = ""
        is_open: bool = True

    # --- HR ---
    @ext.post("/hr/attendance")
    async def attendance(data: AttendanceIn, user: dict = Depends(get_current_user)):
        doc = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
               "action": data.action, "created_at": _now_iso()}
        await db.attendance.insert_one(doc)
        await log_activity(user, f"attendance_{data.action}", "hr", target=doc["id"])
        doc.pop("_id", None)
        return doc

    @ext.get("/hr/attendance")
    async def list_attendance(user: dict = Depends(get_current_user)):
        return [{**d, "_id": None} and {k:v for k,v in d.items() if k!="_id"} async for d in
                db.attendance.find({}).sort("created_at", -1).limit(500)]

    @ext.get("/hr/leaves")
    async def list_leaves(user: dict = Depends(get_current_user)):
        cur = db.leaves.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/leaves")
    async def create_leave(data: LeaveIn, user: dict = Depends(get_current_user)):
        doc = {"id": str(uuid.uuid4()), "user_id": data.user_id or user["id"],
               "from_date": data.from_date, "to_date": data.to_date,
               "reason": data.reason, "type": data.type,
               "status": "pending", "created_at": _now_iso()}
        await db.leaves.insert_one(doc)
        await log_activity(user, "leave_requested", "hr", target=doc["id"])
        doc.pop("_id", None); return doc

    @ext.patch("/hr/leaves/{lid}")
    async def update_leave(lid: str, data: StatusIn,
                           actor: dict = Depends(require_perm("employees.manage"))):
        await db.leaves.update_one({"id": lid}, {"$set": {"status": data.status}})
        await log_activity(actor, f"leave_{data.status}", "hr", target=lid)
        return {"ok": True}

    @ext.get("/hr/payroll")
    async def list_payroll(actor: dict = Depends(require_perm("employees.manage"))):
        cur = db.payroll.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/payroll")
    async def create_payroll(data: PayrollIn,
                             actor: dict = Depends(require_perm("employees.manage"))):
        net = data.base + data.bonus - data.deduction
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "net": net, "created_at": _now_iso()}
        await db.payroll.insert_one(doc)
        await log_activity(actor, "payroll_created", "hr", target=doc["id"])
        doc.pop("_id", None); return doc

    @ext.get("/hr/evaluations")
    async def list_evals(user: dict = Depends(get_current_user)):
        cur = db.evaluations.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/evaluations")
    async def create_eval(data: EvaluationIn,
                          actor: dict = Depends(require_perm("employees.manage"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "evaluator_id": actor["id"], "created_at": _now_iso()}
        await db.evaluations.insert_one(doc)
        await log_activity(actor, "evaluation_created", "hr", target=doc["id"])
        doc.pop("_id", None); return doc

    # --- HR: Bonuses ---
    @ext.get("/hr/bonuses")
    async def list_bonuses(actor: dict = Depends(require_perm("employees.manage"))):
        cur = db.bonuses.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/bonuses")
    async def create_bonus(data: BonusIn, actor: dict = Depends(require_perm("employees.manage"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "created_by": actor["id"], "created_by_name": actor["name"], "created_at": _now_iso()}
        await db.bonuses.insert_one(doc)
        await log_activity(actor, "bonus_created", "hr", target=doc["id"],
                           meta={"user_id": data.user_id, "amount": data.amount})
        # Notify user
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": data.user_id, "type": "hr_bonus",
            "title": "مكافأة جديدة 🎉", "body": f"تم منحك مكافأة قدرها {data.amount}",
            "read": False, "created_at": _now_iso(),
        })
        doc.pop("_id", None); return doc

    @ext.delete("/hr/bonuses/{bid}")
    async def delete_bonus(bid: str, actor: dict = Depends(require_perm("employees.manage"))):
        await db.bonuses.delete_one({"id": bid})
        return {"ok": True}

    # --- HR: Deductions ---
    @ext.get("/hr/deductions")
    async def list_deductions(actor: dict = Depends(require_perm("employees.manage"))):
        cur = db.deductions.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/deductions")
    async def create_deduction(data: DeductionIn, actor: dict = Depends(require_perm("employees.manage"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "created_by": actor["id"], "created_by_name": actor["name"], "created_at": _now_iso()}
        await db.deductions.insert_one(doc)
        await log_activity(actor, "deduction_created", "hr", target=doc["id"],
                           meta={"user_id": data.user_id, "amount": data.amount})
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": data.user_id, "type": "hr_deduction",
            "title": "خصم من الراتب", "body": f"تم تسجيل خصم قدره {data.amount}: {data.reason}",
            "read": False, "created_at": _now_iso(),
        })
        doc.pop("_id", None); return doc

    @ext.delete("/hr/deductions/{did}")
    async def delete_deduction(did: str, actor: dict = Depends(require_perm("employees.manage"))):
        await db.deductions.delete_one({"id": did})
        return {"ok": True}

    # --- HR: Promotions ---
    @ext.get("/hr/promotions")
    async def list_promotions(user: dict = Depends(get_current_user)):
        cur = db.promotions.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/promotions")
    async def create_promotion(data: PromotionIn, actor: dict = Depends(require_perm("employees.manage"))):
        # Also update user's primary role
        current = await db.users.find_one({"id": data.user_id})
        from_role = data.from_role or (current.get("role") if current else "")
        doc = {"id": str(uuid.uuid4()), **data.model_dump(), "from_role": from_role,
               "created_by": actor["id"], "created_by_name": actor["name"], "created_at": _now_iso()}
        await db.promotions.insert_one(doc)
        # Update role
        new_perms = set(DEFAULT_ROLE_PERMS.get(data.to_role, []))
        current_roles = set((current or {}).get("roles") or [])
        current_roles.add(data.to_role)
        merged_perms = set()
        for r in current_roles:
            merged_perms.update(DEFAULT_ROLE_PERMS.get(r, []))
        await db.users.update_one({"id": data.user_id}, {"$set": {
            "role": data.to_role, "roles": list(current_roles),
            "permissions": list(merged_perms), "permissions_customized": False,
        }})
        await log_activity(actor, "promotion_created", "hr", target=doc["id"],
                           meta={"user_id": data.user_id, "to_role": data.to_role})
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": data.user_id, "type": "hr_promotion",
            "title": "ترقية 🚀", "body": f"تمت ترقيتك إلى {data.to_role}",
            "read": False, "created_at": _now_iso(),
        })
        doc.pop("_id", None); return doc

    @ext.delete("/hr/promotions/{pid}")
    async def delete_promotion(pid: str, actor: dict = Depends(require_perm("employees.manage"))):
        await db.promotions.delete_one({"id": pid})
        return {"ok": True}

    # --- HR: Penalties ---
    @ext.get("/hr/penalties")
    async def list_penalties(actor: dict = Depends(require_perm("employees.manage"))):
        cur = db.penalties.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/penalties")
    async def create_penalty(data: PenaltyIn, actor: dict = Depends(require_perm("employees.manage"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "created_by": actor["id"], "created_by_name": actor["name"],
               "active": True, "created_at": _now_iso()}
        await db.penalties.insert_one(doc)
        await log_activity(actor, "penalty_created", "hr", target=doc["id"],
                           meta={"user_id": data.user_id, "type": data.type})
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": data.user_id, "type": "hr_penalty",
            "title": f"عقوبة: {data.type}",
            "body": f"[{data.severity}] {data.reason}",
            "read": False, "created_at": _now_iso(),
        })
        doc.pop("_id", None); return doc

    @ext.patch("/hr/penalties/{pid}")
    async def toggle_penalty(pid: str, actor: dict = Depends(require_perm("employees.manage"))):
        p = await db.penalties.find_one({"id": pid})
        if not p:
            raise HTTPException(404, "Not found")
        await db.penalties.update_one({"id": pid}, {"$set": {"active": not p.get("active", True)}})
        return {"ok": True}

    @ext.delete("/hr/penalties/{pid}")
    async def delete_penalty(pid: str, actor: dict = Depends(require_perm("employees.manage"))):
        await db.penalties.delete_one({"id": pid})
        return {"ok": True}

    # --- HR: Positions (Careers) ---
    @ext.get("/hr/positions")
    async def list_positions(user: dict = Depends(get_current_user)):
        cur = db.positions.find({}).sort("created_at", -1).limit(200)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/hr/positions")
    async def create_position(data: PositionIn, actor: dict = Depends(require_perm("employees.manage"))):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "created_by": actor["id"], "created_by_name": actor["name"], "created_at": _now_iso()}
        await db.positions.insert_one(doc)
        await log_activity(actor, "position_opened", "hr", target=doc["id"],
                           meta={"title": data.title, "is_open": data.is_open})
        doc.pop("_id", None); return doc

    @ext.patch("/hr/positions/{pid}")
    async def update_position(pid: str, data: PositionIn, actor: dict = Depends(require_perm("employees.manage"))):
        await db.positions.update_one({"id": pid}, {"$set": data.model_dump()})
        await log_activity(actor, "position_updated", "hr", target=pid)
        return {"ok": True}

    @ext.delete("/hr/positions/{pid}")
    async def delete_position(pid: str, actor: dict = Depends(require_perm("employees.manage"))):
        await db.positions.delete_one({"id": pid})
        return {"ok": True}

    # Public endpoint — only open positions
    @pub.get("/positions")
    async def public_positions():
        cur = _db_public("positions").find({"is_open": True}, {"_id": 0, "created_by": 0, "created_by_name": 0}).sort("created_at", -1).limit(50)
        return [d async for d in cur]

    def _db_public(name):
        return db[name]

    # --- Tasks (advanced) ---
    @ext.get("/tasks/all")
    async def all_tasks(user: dict = Depends(get_current_user)):
        cur = db.tasks.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/tasks/full")
    async def create_full_task(data: TaskFull, user: dict = Depends(get_current_user)):
        assigned_to = data.assigned_to or user["id"]
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "assigned_to": assigned_to, "created_by": user["id"], "creator_name": user["name"],
               "comments": [], "attachments": [], "done": data.status == "done",
               "created_at": _now_iso(), "updated_at": _now_iso()}
        await db.tasks.insert_one(doc)
        await log_activity(user, "task_created", "tasks", target=doc["id"],
                           meta={"title": data.title, "assigned_to": assigned_to})
        # Notify assignee
        if assigned_to != user["id"]:
            await db.notifications.insert_one({
                "id": str(uuid.uuid4()), "user_id": assigned_to,
                "type": "task_assigned", "title": "New task",
                "body": f"{user['name']} assigned you: {data.title}",
                "read": False, "created_at": _now_iso(),
            })
        doc.pop("_id", None); return doc

    @ext.post("/tasks/{tid}/comments")
    async def add_comment(tid: str, data: TaskCommentIn,
                           user: dict = Depends(get_current_user)):
        c = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user["name"],
             "text": data.text, "created_at": _now_iso()}
        await db.tasks.update_one({"id": tid},
            {"$push": {"comments": c}, "$set": {"updated_at": _now_iso()}})
        return c

    # --- Calendar Events ---
    @ext.get("/events")
    async def list_events(user: dict = Depends(get_current_user)):
        cur = db.events.find({}).sort("date", 1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/events")
    async def create_event(data: EventIn, user: dict = Depends(get_current_user)):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "creator_id": user["id"], "created_at": _now_iso()}
        await db.events.insert_one(doc)
        await log_activity(user, "event_created", "calendar", target=doc["id"])
        doc.pop("_id", None); return doc

    @ext.delete("/events/{eid}")
    async def delete_event(eid: str, user: dict = Depends(get_current_user)):
        await db.events.delete_one({"id": eid})
        return {"ok": True}

    # --- Team Chat ---
    @ext.get("/channels")
    async def list_channels(user: dict = Depends(get_current_user)):
        cur = db.channels.find({"$or": [{"members": user["id"]}, {"type": "public"}]}).limit(500)
        docs = [{k:v for k,v in d.items() if k!="_id"} async for d in cur]
        if not docs:
            default = {"id": str(uuid.uuid4()), "name": "general", "type": "public",
                       "members": [], "creator_id": user["id"], "created_at": _now_iso()}
            await db.channels.insert_one(default)
            default.pop("_id", None)
            docs = [default]
        return docs

    @ext.post("/channels")
    async def create_channel(data: ChannelIn, user: dict = Depends(get_current_user)):
        members = list(set((data.members or []) + [user["id"]]))
        doc = {"id": str(uuid.uuid4()), "name": data.name, "type": data.type,
               "members": members, "creator_id": user["id"], "created_at": _now_iso()}
        await db.channels.insert_one(doc)
        doc.pop("_id", None); return doc

    @ext.get("/channels/{cid}/messages")
    async def list_messages(cid: str, user: dict = Depends(get_current_user)):
        cur = db.messages.find({"channel_id": cid}).sort("created_at", 1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/messages")
    async def post_message(data: MessageIn, user: dict = Depends(get_current_user)):
        doc = {"id": str(uuid.uuid4()), "channel_id": data.channel_id,
               "user_id": user["id"], "user_name": user["name"],
               "text": data.text, "file_url": data.file_url,
               "read_by": [],
               "created_at": _now_iso()}
        await db.messages.insert_one(doc)
        doc.pop("_id", None); return doc

    @ext.delete("/messages/{mid}")
    async def delete_message(mid: str, user: dict = Depends(get_current_user)):
        msg = await db.messages.find_one({"id": mid})
        if not msg:
            raise HTTPException(404, "Message not found")
        # Owner OR employees.manage can delete
        is_owner = msg.get("user_id") == user["id"]
        can_manage = "employees.manage" in (user.get("permissions") or [])
        if not (is_owner or can_manage):
            raise HTTPException(403, "You can only delete your own messages")
        await db.messages.update_one({"id": mid}, {"$set": {
            "text": "",
            "file_url": None,
            "deleted": True,
            "deleted_at": _now_iso(),
            "deleted_by_name": user["name"],
        }})
        await log_activity(user, "message_deleted", "chat", target=mid,
                           meta={"channel_id": msg.get("channel_id")})
        return {"ok": True, "id": mid}

    # --- Files ---
    @ext.post("/files/upload")
    async def upload_file(file: UploadFile = File(...),
                          category: str = Form("documents"),
                          user: dict = Depends(get_current_user)):
        content = await file.read()
        if len(content) > 100 * 1024 * 1024:
            raise HTTPException(413, "File too large (max 100MB)")
        ext_name = Path(file.filename or "").suffix
        fname = f"{uuid.uuid4()}{ext_name}"
        (UPLOAD_DIR / fname).write_bytes(content)
        doc = {"id": str(uuid.uuid4()), "filename": file.filename,
               "storage_name": fname, "url": f"/api/files/download/{fname}",
               "content_type": file.content_type, "size": len(content),
               "category": category, "uploader_id": user["id"],
               "uploader_name": user["name"], "created_at": _now_iso()}
        await db.files.insert_one(doc)
        await log_activity(user, "file_uploaded", "files", target=doc["id"],
                           meta={"filename": file.filename, "size": len(content)})
        doc.pop("_id", None); return doc

    @ext.get("/files")
    async def list_files(user: dict = Depends(get_current_user),
                         category: Optional[str] = None):
        q = {}
        if category: q["category"] = category
        cur = db.files.find(q).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.delete("/files/{fid}")
    async def delete_file(fid: str, user: dict = Depends(get_current_user)):
        f = await db.files.find_one({"id": fid})
        if f:
            try: (UPLOAD_DIR / f["storage_name"]).unlink(missing_ok=True)
            except Exception: pass
        await db.files.delete_one({"id": fid})
        return {"ok": True}

    @pub.get("/files/download/{fname}")
    async def download_file(fname: str):
        fpath = UPLOAD_DIR / fname
        if not fpath.exists():
            raise HTTPException(404, "File not found")
        return FileResponse(str(fpath))

    # --- Social Media ---
    @ext.get("/social/posts")
    async def list_social(user: dict = Depends(get_current_user)):
        cur = db.social_posts.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/social/posts")
    async def create_social(data: SocialPostIn, user: dict = Depends(get_current_user)):
        doc = {"id": str(uuid.uuid4()), **data.model_dump(),
               "creator_id": user["id"], "creator_name": user["name"],
               "created_at": _now_iso()}
        await db.social_posts.insert_one(doc)
        await log_activity(user, "social_post_created", "social", target=doc["id"],
                           meta={"platform": data.platform})
        doc.pop("_id", None); return doc

    @ext.patch("/social/posts/{pid}")
    async def update_social(pid: str, data: SocialPostIn,
                            user: dict = Depends(get_current_user)):
        await db.social_posts.update_one({"id": pid}, {"$set": data.model_dump()})
        return {"ok": True}

    @ext.delete("/social/posts/{pid}")
    async def delete_social(pid: str, user: dict = Depends(get_current_user)):
        await db.social_posts.delete_one({"id": pid})
        return {"ok": True}

    # --- Notifications ---
    @ext.get("/notifications")
    async def list_notifs(user: dict = Depends(get_current_user)):
        cur = db.notifications.find(
            {"$or": [{"user_id": user["id"]}, {"user_id": None}]}
        ).sort("created_at", -1).limit(100)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.post("/notifications/read_all")
    async def read_all(user: dict = Depends(get_current_user)):
        await db.notifications.update_many(
            {"$or": [{"user_id": user["id"]}, {"user_id": None}]},
            {"$set": {"read": True}},
        )
        return {"ok": True}

    @ext.post("/notifications/{nid}/read")
    async def read_one(nid: str, user: dict = Depends(get_current_user)):
        await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
        return {"ok": True}

    # --- Applications (Public + Admin) ---
    @pub.post("/applications")
    async def submit_application(
        name: str = Form(...), age: int = Form(...), city: str = Form(...),
        email: str = Form(...), phone: str = Form(...),
        position: str = Form(...), experiences: str = Form(...),
        years: int = Form(...), portfolio: str = Form(""),
        socials: str = Form(""), message: str = Form(""),
        cv: Optional[UploadFile] = File(None),
    ):
        cv_url = None
        if cv:
            if cv.content_type != "application/pdf":
                raise HTTPException(415, "CV must be PDF")
            content = await cv.read()
            if len(content) > 10 * 1024 * 1024:
                raise HTTPException(413, "CV too large (max 10MB)")
            fname = f"cv_{uuid.uuid4()}.pdf"
            (UPLOAD_DIR / fname).write_bytes(content)
            cv_url = f"/api/files/download/{fname}"
        doc = {"id": str(uuid.uuid4()), "name": name, "age": age, "city": city,
               "email": email.lower(), "phone": phone, "position": position,
               "experiences": experiences, "years": years, "portfolio": portfolio,
               "socials": socials, "message": message, "cv_url": cv_url,
               "status": "Waiting", "created_at": _now_iso()}
        await db.applications.insert_one(doc)
        # Global notification for HR
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": None,
            "type": "job_application", "title": "New job application",
            "body": f"{name} applied for {position}",
            "read": False, "created_at": _now_iso(),
        })
        doc.pop("_id", None); return doc

    @ext.get("/applications")
    async def list_apps(actor: dict = Depends(require_perm("employees.manage"))):
        cur = db.applications.find({}).sort("created_at", -1).limit(500)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @ext.patch("/applications/{aid}")
    async def update_app(aid: str, data: StatusIn,
                         actor: dict = Depends(require_perm("employees.manage"))):
        if data.status not in {"Approve","Reject","Waiting","Interview","Hired"}:
            raise HTTPException(400, "Invalid status")
        await db.applications.update_one({"id": aid}, {"$set": {"status": data.status}})
        await log_activity(actor, f"application_{data.status.lower()}", "applications", target=aid)
        return {"ok": True}

    # --- AI (Gemini 3.1 Pro) ---
    @ext.post("/ai/generate")
    async def ai_generate(data: AIGenIn, user: dict = Depends(get_current_user)):
        if not EMERGENT_LLM_KEY:
            raise HTTPException(500, "AI not configured")
        try:
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            sys_msg = ("You are an assistant for UR SETUP OS — an internal company operating system. "
                       "Help with content generation, social captions, summaries. Reply concisely.")
            if data.context: sys_msg += f"\nContext: {data.context}"
            chat = (LlmChat(api_key=EMERGENT_LLM_KEY, session_id=str(uuid.uuid4()),
                            system_message=sys_msg)
                    .with_model("gemini", "gemini-3.1-pro-preview"))
            text = await chat.send_message(UserMessage(text=data.prompt))
            await log_activity(user, "ai_generated", "ai", meta={"prompt_len": len(data.prompt)})
            return {"text": text if isinstance(text, str) else str(text)}
        except Exception as e:
            logging.exception("AI failed")
            raise HTTPException(500, f"AI failed: {str(e)[:200]}")

    # --- Reports ---
    @ext.get("/reports/summary")
    async def reports_summary(user: dict = Depends(get_current_user)):
        users_total = await db.users.count_documents({})
        users_online = await db.users.count_documents({"status": "online"})
        tasks_total = await db.tasks.count_documents({})
        tasks_done = await db.tasks.count_documents({"done": True})
        apps_total = await db.applications.count_documents({})
        apps_waiting = await db.applications.count_documents({"status": "Waiting"})
        events_total = await db.events.count_documents({})
        social_posts = await db.social_posts.count_documents({})
        # 7-day trend
        trend = []
        for i in range(6, -1, -1):
            day = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
            c = await db.activity_logs.count_documents({"created_at": {"$regex": f"^{day}"}})
            trend.append({"day": day, "activity": c})
        # Users by role
        by_role = {}
        async for u in db.users.find({}, {"_id": 0, "role": 1, "roles": 1}):
            roles = u.get("roles") or ([u.get("role")] if u.get("role") else [])
            for r in roles:
                by_role[r] = by_role.get(r, 0) + 1
        return {
            "users_total": users_total, "users_online": users_online,
            "tasks_total": tasks_total, "tasks_done": tasks_done,
            "applications_total": apps_total, "applications_waiting": apps_waiting,
            "events_total": events_total, "social_posts": social_posts,
            "trend": trend, "by_role": by_role,
        }

    # --- Global Search ---
    @ext.get("/search")
    async def search(q: str = Query(..., min_length=1),
                     user: dict = Depends(get_current_user)):
        ql = q.lower()
        out = {"users": [], "tasks": [], "applications": [], "events": [], "files": []}
        async for x in db.users.find({}, {"_id": 0, "password_hash": 0}).limit(200):
            if ql in (x.get("name","").lower()) or ql in (x.get("email","").lower()):
                out["users"].append(x)
        async for x in db.tasks.find({}).limit(300):
            x.pop("_id", None)
            if ql in (x.get("title","").lower()) or ql in (x.get("description","").lower()):
                out["tasks"].append(x)
        async for x in db.applications.find({}).limit(300):
            x.pop("_id", None)
            if ql in (x.get("name","").lower()) or ql in (x.get("position","").lower()):
                out["applications"].append(x)
        async for x in db.events.find({}).limit(300):
            x.pop("_id", None)
            if ql in (x.get("title","").lower()):
                out["events"].append(x)
        async for x in db.files.find({}).limit(300):
            x.pop("_id", None)
            if ql in (x.get("filename","").lower()):
                out["files"].append(x)
        return out

    app.include_router(ext)
    app.include_router(pub)
