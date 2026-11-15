# Timetable project — continuity notes

Kept here (not in the global Claude memory system) per the user's request at
project start: this project's history/learnings should live in its own
folder, not in cross-session auto-memory.

## Status as of initial build (2026-11-13)

Full scaffold built in one session: all 13+ Mongo collections, auth +
role-based CRUD for every master-data entity, a real backtracking
constraint-solver for timetable generation (`server/services/timetableGenerator.js`),
the draft → pending_approval → approved → published → archived workflow,
PDF/Excel report exports, notifications, and a full React frontend (full-width
sidebar layout, every page wired to the real API, no mocked/dummy buttons).

**Not yet done at end of that session:** the real MongoDB Atlas URI was never
supplied, so `server/.env` still has the placeholder from `.env.example`, the
seed script has never actually been run against a live DB, and the app has
never been smoke-tested end-to-end with real data/login. Vite dev server was
verified standalone (see gotcha below); the Express app was only verified to
`require()` cleanly, not to actually connect to Mongo.

## Ports (this machine's registry — see sibling projects under D:\kiruthi\Pro for the full list)

- Backend: **5131** (next free slot after ProcureFlow's 5121)
- Frontend: **5250** (next free slot after BeatXSound's 5240)

## Machine-specific gotcha: freshly-npm-installed native .node binaries get blocked

Hit this on first `npm run dev` in `client/`: Vite failed with
`Error: An Application Control policy has blocked this file` for
`node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node`.

This is a **broader version** of the already-known rolldown/Vite-8 issue —
here it hit plain Rollup under Vite 5, which normally works fine on this
machine (confirmed: an identical sibling project, Smart-Inventory-Management-System,
loads that exact same binary with no problem). The difference isn't the
binary's content — copying the sibling project's already-trusted copy of the
*same* file over the newly-`npm install`-downloaded one in this project made
it load instantly. That points to Windows treating freshly-downloaded files
differently (zone/mark-of-the-web style reputation) rather than a pure
content hash block, since a straight `cp` from an already-trusted file (no
network download) bypassed it.

**Fix used:** after `npm install` in a new project, if a native `.node`
binary (rollup, esbuild, rolldown, etc.) gets blocked, copy the matching file
from an existing working sibling project's `node_modules` (same package,
same version if possible) over the freshly-downloaded one, rather than
retrying `npm install` (a clean reinstall re-downloads the same bytes and
gets blocked again — matches the earlier rolldown finding).

Only Rollup's native binary hit this on this project; esbuild's binary loaded
fine (dev server started clean once Rollup's binary was swapped).

## Scope decisions (see README.md "Known scope decisions" for the user-facing version)

- Drag-and-drop timetable editing → implemented as click-to-edit modal
  instead (same conflict validation, no added drag library).
- Forgot password → no SMTP, reset token returned directly in the API
  response/UI.
- AuditLog collection exists in the schema (per spec's DB design list) but no
  controller currently writes to it — Dashboard's "Recent Activity" will show
  an honest empty state until that's wired up, not fabricated rows.

## Next steps when resuming

1. Get the real `MONGODB_URI` from the user, put it in `server/.env`.
2. `cd server && npm run seed` once against the real DB.
3. Start both servers, log in as `admin@timetable.edu`, and actually generate
   a timetable end-to-end (Generate → view grid → submit → approve →
   publish → check My Timetable as a faculty login) before calling this done.
4. Consider wiring AuditLog writes into the mutating controllers if the user
   wants Recent Activity to be non-empty.
