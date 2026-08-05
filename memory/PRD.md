# UR SETUP OS - Product Requirements Document

## Original Problem Statement
تطوير UR SETUP OS ليصبح نظام تشغيل داخلي كامل للشركة بجودة Notion/Linear/Slack مع 20+ قسم، رتب متعددة، توظيف، HR، سوشيال، شات لحظي، مهام، تقويم، وتقارير.

## User's Existing Codebase (Preserved)
Repo: https://github.com/teameagls0-cell/ursetup.git
- Public marketing site, legacy admin panel, OS internal system, Google OAuth (Emergent Auth), JWT

## User Choices
- Auth: JWT + preserved Google OAuth
- AI: Gemini 3.1 Pro (Emergent LLM Key)
- Realtime: WebSocket for chat
- Language: Arabic (RTL) + English
- Gmail: `ursetup1@gmail.com` — user linking accounts themselves later

## Architecture
- Backend: FastAPI + Motor + PyJWT + bcrypt + emergentintegrations + IMAP/SMTP
  - `/app/backend/server.py` (legacy code preserved)
  - `/app/backend/server_ext.py` (HR, tasks, calendar, chat, files, social, applications, AI, notifications, search)
  - `/app/backend/server_realtime.py` (WebSocket chat, Gmail send/receive placeholders)
- Frontend: React 18 + React Router 6 + Tailwind + Framer Motion + Sonner + lucide-react + recharts
- Admin seed: `teameagls0@gmail.com` / `URSetup@2026!` (CEO with 41 permissions)

## Implemented Features (chronological)

### Iteration 1 — Foundation
- 20 roles: CEO, COO, HR Manager, Marketing Manager, Marketing, Operations Manager, Operations, Support Manager, Support, Finance Manager, Finance, Tech & Sales, Designer, Video Editor, Content Creator, Social Media Manager, Warehouse Manager, Employee, Intern, Pending
- Multi-role support (users can hold multiple roles simultaneously)
- Extended permissions catalog (41 permissions across all modules)
- Heartbeat every 45s + auto-offline scan
- Public Join Us page (`/join-us`) with CV upload + admin pipeline

### Iteration 2 — Core modules
- HR: Attendance, Leaves, Payroll, Evaluations
- Tasks (Kanban with priority/assignee/due/comments)
- Calendar (meeting/campaign/holiday/launch)
- Team Chat (channels + polling + file uploads)
- Files library (categorized)
- Social Media manager with AI captions (Gemini 3.1 Pro)
- Notifications
- Applications review pipeline (Waiting → Interview → Approve/Reject → Hired)
- Analytics + Reports
- Global Search

### Iteration 3 — Realtime + Search UX
- WebSocket chat (server_realtime.py) with reconnect logic + LIVE indicator
- Smart global search bar with page suggestions + entity results
- Revenue metric restricted to `finance.view` permission
- Mail module UI (send/receive UI ready, Gmail app password pending)

### Iteration 4 — Uploads + Account linkage (bug fix, 100% test pass)
- File uploads tied to `uploader_id` and `uploader_name`
- Max size raised to 100MB
- Image/video/PDF preview in Files page with lightbox
- Social Media accepts direct media uploads (image/video) with visual preview

### Iteration 5 — Chat UX + Full HR
- **Read receipts**: WebSocket + HTTP fallback (`POST /api/os/messages/mark_read`); "شاهد فلان" or "شاهد X أشخاص"
- **Typing indicators**: WebSocket typing events with auto-clear after 4s
- **Platform-specific media validation**: Instagram (≤90s), TikTok (≤10min), Snapchat (≤60s), X (≤140s) — client-side duration check via HTML5 video metadata; size limits per platform
- **HR complete**: added Bonuses, Deductions, Promotions (auto-updates user role & permissions), Penalties (warning/fine/suspension/termination with severity)
- All HR events send in-app notifications to affected employees

### Iteration 6 — Chat delete + inline media
- **Delete messages**: WebSocket broadcast + HTTP DELETE `/api/os/messages/{id}` — owner or `employees.manage` role can delete; soft delete preserves audit trail with `deleted_by_name`
- **Inline media rendering in chat**: images, videos, audio all rendered directly in messages; images open in lightbox on click
- Fallback to attachment link for unsupported file types

## Preserved (NOT touched)
- OSLogin, OSAuthCallback (Emergent Google OAuth)
- All Public site sections (Hero, Products, About, Reviews, FAQ, Contact)
- All existing Admin panel pages
- .env values (only added ADMIN_EMAIL, ADMIN_PASSWORD, GMAIL_ADDRESS, GMAIL_APP_PASSWORD placeholder)
- Existing collections and schemas

## Test Credentials
- Admin: `teameagls0@gmail.com` / `URSetup@2026!`

## Not Yet Implemented (Backlog)
- P1: Salla integration for real Orders/Customers/Products data
- P1: Gmail app password wiring (user will provide later)
- P2: Kanban drag-drop for tasks
- P2: Direct publishing to TikTok/Instagram/Snapchat/X APIs
- P2: Browser push notifications
- P2: 2FA for JWT

## GitHub Push
User's repo: https://github.com/teameagls0-cell/ursetup.git
- Push via Emergent's "Push to GitHub" button
- **Always to a new branch** (e.g., `feature/ur-setup-os-v2`) — never direct to main
- Review diff on GitHub before merging via Pull Request
