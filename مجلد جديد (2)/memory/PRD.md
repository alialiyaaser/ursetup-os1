# UR SETUP OS — Product Requirements Document

## Original Problem Statement
Client (UR SETUP — Saudi e-commerce brand on Salla) wanted an internal Operating System **inside the same site as the storefront** to run the entire company. Must be scalable, bilingual (AR/EN + RTL/LTR), themable (dark/light), with RBAC, activity logs, integration-ready, and one place for the CEO to grant/revoke permissions per employee.

## Feedback Round 1 — 2026-07-26
User raised 6 issues after initial build; ALL fixed:
1. Two separate sites (`/admin` + `/os`) → merged into ONE. `/admin` routes removed entirely; legacy admin features (Reviews, Promo Banner, Newsletter) moved into `/os/marketing` as tabs.
2. Role change returned "فشل التنفيذ" → root-caused: `permissions_customized` flag was incorrectly set to True even when caller didn't send permissions. Fixed. Role change now resets to role defaults automatically.
3. Assigned role produced zero effective permissions → same root cause (flag). Fixed.
4. Blue accent color was requested to be removed → replaced entirely with **monochrome dark palette** (`#0A0A0B` bg, near-white foreground for dark mode; `#FAFAF9`/black for light). No blue anywhere.
5. Security concern that "anyone typing /os sees everything" → NEW Google users are auto-provisioned as **Pending** role with ZERO permissions. They are redirected to `/os/pending` (waiting-for-approval screen) and cannot access any module until CEO grants them a real role.
6. Sidebar not hiding pages a user shouldn't see + realtime updates → NAV filtered by `permissions_effective`. Frontend polls `/api/os/me` every 10s so permission changes reflect within 10s without reload. Plus: CEO can now assign tasks to specific employees via dropdown.

## Architecture
- **Frontend**: React 18 + react-router-dom + Tailwind + lucide-react + sonner
- **Backend**: FastAPI + Motor (async MongoDB) + PyJWT + bcrypt + httpx
- **Auth**: Dual — JWT (email/password) + Emergent Google OAuth session
- **RBAC**: Permission catalog (19 permissions) + roles map to permissions + per-user overrides
- **Structure**: Modular monolith. Every module = a page in `/frontend/src/os/pages/` + optional API router. Adding a new module = add a page + register in NAV + optional API router.

## User Personas & Default Permissions
| Role | Effective Access |
|---|---|
| **CEO** | Everything — full 19 permissions. Only role with `logs.view` & `settings.manage`. |
| **Marketing** | Dashboard, Marketing (Reviews/Promo/Newsletter), Customers, Analytics |
| **Operations** | Dashboard, Orders, Customers, Products (view) |
| **Tech & Sales** | Dashboard, Analytics, Products (manage), Integrations, Settings (view) |
| **Support (دعم فني)** | Dashboard, Support, Customers (view) |
| **Pending** | Nothing — routed to `/os/pending` screen until CEO changes their role |

## Core Requirements (Static)
- ONE site: `/` = storefront (unchanged), `/os` = internal system, `/os/login` = login, `/os/pending` = waiting-approval screen. No `/admin`.
- Bilingual AR/EN with RTL/LTR auto-flip; per-user persisted.
- Dark & Light themes with per-user persisted preference; **monochrome only (no blue)**.
- Sidebar navigation filtered strictly by `permissions_effective`.
- Time-of-day greeting on Dashboard.
- Activity logging: create/update/delete/login/task-complete are all logged.
- Online presence tracking (`last_seen`, `status`) — CEO sees who's online.
- Placeholder-styled modules for future work (Orders, Customers, Analytics).
- Zero-trust for new users: Google sign-up + manual sign-up = `Pending` role with 0 perms.

## What's Been Implemented (2026-07-26)

### Backend (`/api/os/*` + `/api/admin/*`)
- JWT login + Emergent Google session exchange (`/api/os/auth/google/session`)
- `get_current_user` accepts JWT (Bearer) or Emergent session token (Bearer or Cookie)
- Employees CRUD with strict permission gates; role changes auto-reset permissions
- **Per-user permission override** (`PATCH /employees/{uid}` with permissions array)
- Roles CRUD with permission catalog
- Tasks CRUD with **task assignment** (`tasks.assign` permission)
- Activity logs (CEO only via `logs.view`)
- Dashboard summary, online employees (CEO only), recent activity (self / all if CEO)
- User preferences (language + theme) persisted
- Idempotent CEO seed + default roles + Pending role
- Legacy admin (`/api/admin/*`) intact — CEO now included in allowed roles

### Frontend (`/os/*`)
- `/os/login` — monochrome bilingual login with Google button
- `/os` — Dashboard: greeting, 4 metric cards, Quick Actions, Tasks (with assign-to-employee dropdown when `tasks.assign`), Online employees / Recent activity, Recent activity feed for CEO
- `/os/employees` — list + add + inline role change + **permissions modal** (checkbox matrix of all 19 perms) + approve pending users + delete
- `/os/marketing` — tabs: Reviews / Promo Banner / Newsletter (from legacy admin components)
- `/os/products` — Coming Soon items management
- `/os/support` — WhatsApp/Email integration placeholders
- `/os/logs` — Activity logs table (CEO only)
- `/os/settings` — Profile + Language + Theme + **Roles & Permissions editor** (checkbox matrix per role)
- `/os/pending` — Waiting-for-approval screen for zero-perm users
- `/os/{orders,customers,analytics}` — "Coming Soon" placeholders
- Language + Theme + Auth contexts; RTL automatic
- Google OAuth callback synchronous at `/os#session_id=…`
- **10s polling of `/api/os/me`** so permission changes reflect without reload

## Prioritized Backlog
- **P0** — Notifications center wired to bell icon
- **P1** — Salla integration: Orders + Customers real data
- **P1** — WhatsApp Business API adapter (Support module)
- **P1** — Analytics charts (top products, revenue trend, employee performance)
- **P2** — Shift management (start/end shift, work hours)
- **P2** — Email service (SendGrid/Resend) for internal notifications
- **P2** — Mobile app (PWA) reusing same API

## Deployment Notes
- MongoDB: `DB_NAME=ursetup_db`
- Env: `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- Backend all routes `/api/*`; frontend uses `REACT_APP_BACKEND_URL`
- Supervisor manages backend (:8001) & frontend (:3000)
