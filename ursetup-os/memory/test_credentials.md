# UR SETUP OS — Test Credentials

## CEO (Seed Admin — Full Access)
- Email: `ceo@ursetup.com`
- Password: `URSetupOS@2026#Prime`
- Role: **CEO** (all 19 permissions)
- Login URL: `/os/login`

## Login Methods
1. **Email/Password (JWT)** — POST `/api/auth/login`
2. **Google OAuth (Emergent-managed)** — via the "Continue with Google" button
   - New Google users are auto-provisioned as **Pending** role with ZERO permissions
   - They are redirected to `/os/pending` (waiting-for-approval screen)
   - CEO must go to `/os/employees` and change their role to grant access

## Role → Default Permissions
| Role | Permissions |
|---|---|
| CEO | ALL (19) |
| Marketing | dashboard, marketing.*, customers.view, analytics.view |
| Operations | dashboard, orders.*, customers.*, products.view |
| Tech & Sales | dashboard, analytics, products.*, integrations, settings.view |
| Support | dashboard, support.*, customers.view |
| Pending | (none — awaiting approval) |

## Per-User Permission Overrides
CEO can open Employees → click "الصلاحيات" (Permissions) → check any combination of the 19 permissions and save. When custom permissions are set, `permissions_customized: true` is stored so the user gets exactly what CEO picks (not the role defaults). Clicking "reset to role default" clears the customization and the user picks up their role's defaults again.

## Key OS Endpoints
- `GET  /api/os/me` — current user + `permissions_effective`
- `PATCH /api/os/preferences` — save language / theme
- `GET  /api/os/employees` — list (requires `employees.view`)
- `POST /api/os/employees` — create (requires `employees.manage`)
- `PATCH /api/os/employees/{uid}` — update role/permissions/name (auto-resets perms on role change)
- `DELETE /api/os/employees/{uid}` — delete
- `GET  /api/os/permissions-catalog` — full catalog + role defaults
- `GET  /api/os/roles` + `PUT /api/os/roles/{name}` — edit role permissions
- `GET  /api/os/activity-logs` — CEO only
- `GET  /api/os/dashboard/summary` — dashboard data
- `POST /api/os/tasks` — create task (requires `tasks.assign` to assign to others)
- `GET  /api/os/employees/lookup` — light employee list for task assignment
- `POST /api/os/auth/google/session` — Google OAuth exchange

## Live-Refresh (no reload needed)
- Dashboard summary / tasks / activity / online-employees: refreshes every **10 seconds**
- Employees list (online/offline status): every **12 seconds**
- Activity Logs: every **8 seconds**
- User permissions (sidebar): every **10 seconds**

## Integrations Slot (ready — waiting for API keys)
CEO can open Settings → scroll to "التكاملات" and click "ربط" on any of:
- **Salla** — access_token, store_id, webhook_secret
- **WhatsApp Business** — phone_id, access_token
- **Email** — provider, api_key, from_email

Once saved, the integration flips to "connected" and the token is stored (masked in list responses). Actual Salla API calls will be wired next when the user provides real credentials.

Backend endpoints:
- `GET  /api/os/integrations` — list all (creds masked)
- `PUT  /api/os/integrations/{key}` — upsert (requires `integrations.manage`)
- `DELETE /api/os/integrations/{key}` — disconnect

