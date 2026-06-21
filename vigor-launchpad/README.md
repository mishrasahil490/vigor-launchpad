# Vigor Launchpad — CRM & Operations Platform

A full-stack CRM and operations management platform built for an influencer
marketing, creator management, and events company. Covers lead-to-cash:
leads → clients → influencer database → campaigns → events → finance → reporting.

This is a **runnable scaffold**, not a mockup — every screen is wired to a real
Express API with persisted data, JWT auth, and role-based access control.

---

## Architecture

```
vigor-launchpad/
├── backend/      Express API (Node.js) + file-backed JSON database
└── frontend/     React 18 + Vite + Tailwind CSS + Recharts
```

**Why a file-backed database instead of Postgres/MySQL?** It keeps the
project dependency-free (no native modules to compile, no DB server to
install) so it runs anywhere with just Node.js. Every table lives in
`backend/data/*.json`, and all access goes through `backend/src/db.js` —
a thin CRUD layer. Swapping to Postgres/Prisma/MongoDB later means rewriting
that one file; every route already calls `db.all/find/insert/update/remove`,
not raw SQL.

**Auth:** JWT bearer tokens, `bcryptjs` password hashing, role middleware
(`Super Admin`, `Manager`, `Employee`, `Finance`) enforced on every route.
Employees only see records they own; Managers, Finance, and Super Admin see
everything (extend `scopeToUser` in `backend/src/middleware/auth.js` for
finer-grained team scoping).

---

## Getting Started

You need **Node.js 18+** installed locally.

### 1. Backend

```bash
cd backend
npm install
npm run seed     # populates backend/data/*.json with realistic demo data
npm run dev       # starts the API on http://localhost:5050 (nodemon, auto-reload)
# or: npm start    for a plain node run
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev       # starts Vite dev server on http://localhost:5173
```

The frontend dev server proxies all `/api/*` calls to `http://localhost:5050`
automatically (see `frontend/vite.config.js`) — no CORS configuration needed
locally.

Open **http://localhost:5173** and log in.

### Demo credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@vigorlaunchpad.com | Admin@123 |
| Manager | priya.manager@vigorlaunchpad.com | Manager@123 |
| Employee | sneha.employee@vigorlaunchpad.com | Employee@123 |
| Finance | neha.finance@vigorlaunchpad.com | Finance@123 |

The login screen has one-click buttons to fill these in.

Re-run `npm run seed` any time from `backend/` to reset all data back to the
original demo state (it wipes and rebuilds `backend/data/`).

---

## What's implemented

**Modules (full depth, as requested):**
- **Dashboard** — 12 KPI cards + 8 charts (lead funnel, revenue trend,
  campaign status, employee performance, influencer categories, brand-wise
  performance, monthly lead acquisition), all computed live from real data.
- **Leads** — full pipeline (New → Won/Lost), assignment, scoring, activity
  timeline & notes, lead → client conversion.
- **Clients** — brand profiles, GST/billing info, campaign history, invoice
  history, document references.
- **Influencer Database** — 24 seeded creators, advanced filtering (category,
  tier, city, followers, engagement, budget), full rate cards, saved lists,
  CSV export.
- **Campaigns** — full lifecycle status, influencer assignment with agreed
  cost, deliverables/content calendar, live profitability calculation.
- **Events** — vendor allocation, influencer attendance tracking, sponsor
  management, budget vs. spend, profitability.
- **Finance** — invoices, vendor payments, expenses, profitability/outstanding
  summary, mark-as-paid actions.
- **Reports** — 7 pre-built reports (lead conversion, employee performance,
  campaign performance, influencer performance, client revenue, event
  profitability, vendor spend), each exportable to CSV.

**Lighter but functional:**
- **Vendors** — full CRUD, category tagging.
- **Tasks** — kanban-style board, priorities, comments, overdue detection.
- **Settings** — Super Admin user management (create/deactivate team members,
  assign roles).

**Platform-wide:**
- Role-based authentication (JWT) with 4 roles enforced server-side.
- Global search across leads, clients, influencers, campaigns, events, vendors.
- Notification bell with sample notifications (assignment, campaign update,
  event deadline, payment reminder).
- Dark/light mode toggle (persisted).
- Fully responsive layout (collapsible sidebar on mobile).
- CSV export on Influencers and every Report.

---

## What you'd add before production

This is a strong starting scaffold, not a finished production system. Before
shipping to real users:

1. **Swap the JSON file DB for Postgres/MySQL** (the `db.js` abstraction makes
   this a contained change) — needed for concurrent writes, transactions, and
   scale.
2. **Email/push notifications** — the notification *data model* and UI are
   built; wire up an email provider (SendGrid/SES) and a cron/queue for the
   "automatic reminders" requirement.
3. **File uploads** — content samples, contracts, and documents are currently
   represented as text/links; add real file storage (S3-compatible) for actual
   uploads.
4. **PDF export** — CSV export is implemented; PDF export (e.g. via a library
   like `pdfkit` or `puppeteer`) can be added the same way the CSV endpoints
   work today.
5. **Audit logs** — add a write-through log table capturing who changed what,
   surfaced in a Settings → Audit Log screen.
6. **Finer-grained team scoping** — `scopeToUser` currently treats all
   Managers as seeing everything; add a `team` field check if you want
   Managers to see only their own team's records.
7. **Environment/secrets management** — move `JWT_SECRET` out of `.env` into
   a real secrets manager for production deployments.

---

## Tech Stack

- **Backend:** Node.js, Express, JWT (`jsonwebtoken`), `bcryptjs`, file-backed
  JSON persistence
- **Frontend:** React 18, Vite, React Router 6, Tailwind CSS, Recharts,
  Axios, Lucide icons
