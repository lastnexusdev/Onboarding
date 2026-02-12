# Onboarding v2.0 (Node.js + React)

Standalone rewrite of the legacy PHP onboarding app.

## Stack
- Backend: Node.js + Express + SQLite
- Frontend: React + Vite
- Auth: JWT with role/department authorization
- Uploads: direct + chunked uploads

## Key parity with v1
- Login/logout with role-aware routing
- Dashboard statistics and per-tech client views
- Sales intake and client assignment
- Client detail tracking, notes, follow-ups, onboarding history
- Checklist updates with computed progress
- Entitled programs and custom packages
- Admin settings, including New Software Release impact
- User management and report endpoints
- File uploads and chunked uploads

## Included UI modules (original-style workflows)
- Login
- Dashboard (stats + per-tech client tables)
- Sales/Clients (intake, search, bulk delete)
- Client Detail (checklist, notes/callouts, status actions, programs, history)
- History manager (edit/delete history rows)
- Settings (software release + package management)
- Reports
- Users

## Run
```bash
npm install
npm run dev
```

Backend runs on `http://localhost:4000`, frontend on `http://localhost:5173`.

## Environment
Copy `server/.env.example` to `server/.env` and adjust values.
