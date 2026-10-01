# Operator Skill Matrix

Shop-floor skill matrix: who can run which machine, which certificates are about to lapse, and where coverage is a single point of failure.

This file grows with each milestone. Setup that already works:

## Setup

Requires Python 3.11+ and Node 20+.

```text
python -m pip install -r backend/requirements.txt
npm install
npm install --prefix frontend
```

Copy `.env.example` to `.env` only if you need to override a default.

```text
npm run dev      # API on PORT (default 8000) and Vite on 5173
npm test         # backend pytest and frontend vitest
npm run seed     # reset demo data and verify the story (after M2)
```

Open http://localhost:5173 . The API is proxied at `/api`. `GET /api/health` returns `{ ok, db, version }`.

## Assumptions

- `SCHEDULER_ENABLED=false` (or a running pytest test) skips the in-process scheduler. The default is on.
- A missing `X-User-Id` will act as the seeded Shift Supervisor once users exist.
- Relative SQLite paths in `DATABASE_URL` are resolved from the `backend/` directory, not the shell's current folder.
- Hosting configuration is intentionally absent. The app is one process that can later serve `frontend/dist` and `/api`.

## Requirement traceability

Filled in at M8. Compulsory behaviour lands in M1–M6; hero features in M7.
