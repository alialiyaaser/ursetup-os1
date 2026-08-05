"""UR SETUP OS — Realtime WebSocket + Gmail (Send/Receive).

Provides:
  - WebSocket at /api/os/ws/chat/{channel_id}?token=... for realtime messages,
    typing indicators, and read receipts.
  - Gmail send via SMTP + receive via IMAP (env-configured)
"""
import os
import json
import asyncio
import logging
import uuid
import email
import smtplib
from datetime import datetime, timezone
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Set, List, Tuple
from imaplib import IMAP4_SSL

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr

_JWT_SECRET = None
_JWT_ALG = "HS256"
_db = None
_deps = {}

# channel_id -> set of (websocket, user_id, user_name)
_rooms: Dict[str, Set[Tuple[WebSocket, str, str]]] = {}
_lock = asyncio.Lock()


def wire_realtime(app, db, jwt_secret, get_current_user, require_perm, log_activity, _now_iso):
    global _JWT_SECRET, _db
    _JWT_SECRET = jwt_secret
    _db = db
    _deps.update(get_current_user=get_current_user, require_perm=require_perm,
                 log_activity=log_activity, now_iso=_now_iso)

    ws_router = APIRouter()
    mail_router = APIRouter(prefix="/api/os/mail", tags=["mail"])

    class EmailSendIn(BaseModel):
        to: EmailStr
        subject: str
        body: str
        cc: Optional[str] = None

    async def _broadcast(channel_id: str, payload: dict, exclude_ws: Optional[WebSocket] = None):
        dead = []
        async with _lock:
            peers = list(_rooms.get(channel_id, set()))
        for ws, uid, uname in peers:
            if ws is exclude_ws:
                continue
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append((ws, uid, uname))
        if dead:
            async with _lock:
                for entry in dead:
                    _rooms.get(channel_id, set()).discard(entry)

    @ws_router.websocket("/api/os/ws/chat/{channel_id}")
    async def ws_chat(ws: WebSocket, channel_id: str, token: str = Query(...)):
        try:
            payload = jwt.decode(token, _JWT_SECRET, algorithms=[_JWT_ALG])
            uid = payload["sub"]
            user = await _db.users.find_one({"id": uid})
            if not user:
                await ws.close(code=1008); return
        except Exception:
            await ws.close(code=1008); return

        uname = user.get("name") or user.get("email", "")
        await ws.accept()
        entry = (ws, uid, uname)
        async with _lock:
            _rooms.setdefault(channel_id, set()).add(entry)
            present = [{"user_id": u, "user_name": n} for _, u, n in _rooms[channel_id] if u != uid]
        # Send who's online in this channel
        try:
            await ws.send_json({"type": "presence", "present": present})
        except Exception:
            pass

        try:
            while True:
                raw = await ws.receive_text()
                try:
                    payload = json.loads(raw)
                except Exception:
                    continue

                event = payload.get("type") or ("msg" if payload.get("text") else None)

                if event == "typing":
                    await _broadcast(channel_id, {
                        "type": "typing", "user_id": uid, "user_name": uname,
                        "is_typing": bool(payload.get("is_typing")),
                    }, exclude_ws=ws)

                elif event == "read":
                    mid = payload.get("message_id")
                    if not mid:
                        continue
                    reader = {"user_id": uid, "user_name": uname, "at": _deps["now_iso"]()}
                    # Add reader if not already present (skip own messages)
                    doc = await _db.messages.find_one({"id": mid})
                    if not doc or doc.get("user_id") == uid:
                        continue
                    already = any(r.get("user_id") == uid for r in (doc.get("read_by") or []))
                    if not already:
                        await _db.messages.update_one(
                            {"id": mid},
                            {"$push": {"read_by": reader}},
                        )
                        await _broadcast(channel_id, {
                            "type": "read", "message_id": mid, "reader": reader,
                        })

                elif event == "delete":
                    mid = payload.get("message_id")
                    if not mid: continue
                    doc = await _db.messages.find_one({"id": mid})
                    if not doc: continue
                    perms = set(user.get("permissions") or [])
                    if doc.get("user_id") != uid and "employees.manage" not in perms:
                        continue
                    await _db.messages.update_one({"id": mid}, {"$set": {
                        "text": "", "file_url": None,
                        "deleted": True, "deleted_at": _deps["now_iso"](),
                        "deleted_by_name": uname,
                    }})
                    await _broadcast(channel_id, {"type": "delete", "message_id": mid, "deleted_by_name": uname})

                elif event == "msg" or payload.get("text"):
                    text = (payload.get("text") or "").strip()
                    if not text:
                        continue
                    doc = {
                        "id": str(uuid.uuid4()), "channel_id": channel_id,
                        "user_id": uid, "user_name": uname,
                        "text": text, "file_url": payload.get("file_url"),
                        "read_by": [],
                        "created_at": _deps["now_iso"](),
                    }
                    await _db.messages.insert_one(dict(doc))
                    doc.pop("_id", None)
                    await _broadcast(channel_id, {"type": "msg", **doc})

        except WebSocketDisconnect:
            pass
        except Exception:
            logging.exception("ws error")
        finally:
            async with _lock:
                _rooms.get(channel_id, set()).discard(entry)
            # Notify others this user stopped typing
            await _broadcast(channel_id, {
                "type": "typing", "user_id": uid, "user_name": uname, "is_typing": False,
            })

    # ---- HTTP fallback: mark message as read ----
    class ReadIn(BaseModel):
        message_ids: List[str]

    @ws_router.post("/api/os/messages/mark_read")
    async def mark_read(data: ReadIn, user: dict = Depends(_deps["get_current_user"])):
        if not data.message_ids:
            return {"ok": True, "updated": 0}
        reader = {"user_id": user["id"], "user_name": user.get("name", ""), "at": _deps["now_iso"]()}
        # Only add if not already present
        result = await _db.messages.update_many(
            {"id": {"$in": data.message_ids}, "user_id": {"$ne": user["id"]},
             "read_by.user_id": {"$ne": user["id"]}},
            {"$push": {"read_by": reader}},
        )
        return {"ok": True, "updated": result.modified_count}

    # ---- Gmail send/receive ----
    async def _mail_perm_check(user):
        perms = set(user.get("permissions") or [])
        allowed_roles = {"CEO", "COO", "Support Manager", "HR Manager", "Marketing Manager"}
        roles = set(user.get("roles") or []) | ({user.get("role")} if user.get("role") else set())
        if roles & allowed_roles:
            return
        if "support.manage" in perms:
            return
        raise HTTPException(403, "Not allowed to access mail")

    @mail_router.post("/send")
    async def send_mail(data: EmailSendIn, user: dict = Depends(_deps["get_current_user"])):
        await _mail_perm_check(user)
        addr = os.environ.get("GMAIL_ADDRESS", "").strip()
        pwd = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
        if not addr or not pwd:
            raise HTTPException(500, "Gmail not configured. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD in backend/.env")
        msg = MIMEMultipart()
        msg["From"] = addr
        msg["To"] = data.to
        if data.cc: msg["Cc"] = data.cc
        msg["Subject"] = data.subject
        msg.attach(MIMEText(data.body, "plain", "utf-8"))
        try:
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
                s.login(addr, pwd)
                recipients = [data.to] + ([c.strip() for c in (data.cc or "").split(",") if c.strip()])
                s.sendmail(addr, recipients, msg.as_string())
        except Exception as e:
            raise HTTPException(500, f"SMTP failed: {str(e)[:200]}")
        rec = {"id": str(uuid.uuid4()), "type": "sent", "to": data.to, "subject": data.subject,
               "body": data.body[:5000], "sender_id": user["id"], "created_at": _deps["now_iso"]()}
        await _db.mail.insert_one(rec)
        await _deps["log_activity"](user, "email_sent", "mail", target=data.to,
                                    meta={"subject": data.subject})
        rec.pop("_id", None); return rec

    @mail_router.post("/sync")
    async def sync_inbox(limit: int = 20, user: dict = Depends(_deps["get_current_user"])):
        await _mail_perm_check(user)
        addr = os.environ.get("GMAIL_ADDRESS", "").strip()
        pwd = os.environ.get("GMAIL_APP_PASSWORD", "").strip()
        if not addr or not pwd:
            raise HTTPException(500, "Gmail not configured")
        try:
            imap = IMAP4_SSL("imap.gmail.com")
            imap.login(addr, pwd)
            imap.select("INBOX")
            typ, data = imap.search(None, "ALL")
            ids = data[0].split()[-limit:][::-1]
            new_count = 0
            for i in ids:
                typ, msg_data = imap.fetch(i, "(RFC822)")
                if not msg_data or not msg_data[0]: continue
                raw = msg_data[0][1]
                m = email.message_from_bytes(raw)
                mid = m.get("Message-ID") or f"noid-{i.decode()}"
                if await _db.mail.find_one({"message_id": mid}):
                    continue
                body = ""
                if m.is_multipart():
                    for p in m.walk():
                        if p.get_content_type() == "text/plain":
                            try: body = p.get_payload(decode=True).decode(errors="ignore")[:5000]; break
                            except Exception: pass
                else:
                    try: body = (m.get_payload(decode=True) or b"").decode(errors="ignore")[:5000]
                    except Exception: body = ""
                await _db.mail.insert_one({
                    "id": str(uuid.uuid4()), "message_id": mid, "type": "received",
                    "from": m.get("From", ""), "to": m.get("To", ""),
                    "subject": m.get("Subject", ""), "body": body,
                    "date": m.get("Date", ""), "read": False,
                    "created_at": _deps["now_iso"](),
                })
                new_count += 1
            imap.close(); imap.logout()
            return {"ok": True, "new": new_count}
        except Exception as e:
            raise HTTPException(500, f"IMAP failed: {str(e)[:200]}")

    @mail_router.get("/inbox")
    async def inbox(user: dict = Depends(_deps["get_current_user"])):
        await _mail_perm_check(user)
        cur = _db.mail.find({}).sort("created_at", -1).limit(200)
        return [{k:v for k,v in d.items() if k!="_id"} async for d in cur]

    @mail_router.post("/{mid}/read")
    async def mark_mail_read(mid: str, user: dict = Depends(_deps["get_current_user"])):
        await _mail_perm_check(user)
        await _db.mail.update_one({"id": mid}, {"$set": {"read": True}})
        return {"ok": True}

    app.include_router(ws_router)
    app.include_router(mail_router)
