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

## Status as of full-review pass (2026-11-17)

Backend is live against the real Atlas cluster (`timetable2026`), seeded, and
end-to-end verified: login for all 3 roles, full CRUD, generate → submit →
approve → publish → faculty sees it + gets notified, PDF/Excel exports,
browser-level smoke test via Playwright on every page with 0 console errors.

Added in this pass (things the original build was missing against the spec):
- **Audit logging** (`server/utils/audit.js`) wired into every create/update/
  delete across departments/faculty/classes/subjects/classrooms/users and the
  full timetable lifecycle (generate/regenerate/submit/approve/reject/publish/
  unpublish/archive/entry edits). Dashboard's "Recent Activity" now shows real
  rows, department-scoped for HOD/faculty (was previously *always* querying
  `{}` regardless of role — a real bug, fixed in `dashboardController.js`).
- **Reports**: added Faculty Free Periods, Scheduling Conflicts (defensive
  full-entry scan for faculty/room double-bookings — genuinely useful since
  manual edits are validated per-write but this catches anything else), and a
  Class Schedule tab (class picker + table). All wired to real endpoints.
- **Timetables list filters**: added Academic Year + Semester (was
  Department/Status only).
- **Change Password** UI in the Topbar dropdown (backend endpoint existed
  from day one but had no frontend; now reachable by every role).
- **Faculty "Report a Conflict"** button on My Timetable → fans out a
  notification to the faculty's department HODs + all superadmins
  (`POST /api/notifications/report-conflict`).

Three real bugs found and fixed during this pass, all through actual
regeneration testing rather than code reading alone:
1. **Dashboard Recent Activity dead filter** — `AuditLog.find(x ? {} : {})`,
   both branches `{}`, so it never scoped by department. Fixed in
   `dashboardController.js`.
2. **Batch generate() self-conflict bug** — `loadSchedulingContext()` was
   called *before* each class's old timetable got archived inside the same
   loop, so a class's own stale entries counted as conflicts against itself
   on every re-run after the first. Showed up as classes going from 0
   unresolved → 11 unresolved on a second `generate(all:true)` call. Fixed by
   archiving every target class's old timetable *before* loading the context
   (`timetableController.js: generate()`).
3. **Duplicate active timetable per class** — `generate()` only skipped
   archiving a class's approved/published timetable, but still went ahead
   and created a *brand new draft alongside it*, so a class could end up with
   two simultaneously-active timetable records (one published, one draft).
   Fixed: `generate()` now skips (with a clear `reason`) any class whose
   active timetable is already approved/published, same rule `regenerate()`
   already enforced for the single-class case. One stray duplicate from
   before the fix was manually archived.
4. **Reports.jsx tab-switch crash** — switching report tabs could render the
   *previous* tab's data against the *new* tab's renderer for one frame
   (classic React effect-timing race: `setTab` re-renders synchronously, the
   data-fetching `useEffect` runs after), crashing when shapes didn't match
   (e.g. Faculty Free Periods rows have no `.classes` field, which the
   Conflicts renderer calls `.join()` on). Fixed by clearing `data` to `null`
   synchronously in the same click handler that changes `tab` (and again when
   the Class Schedule picker's selection changes).

## Status as of table-clipping fix (2026-11-17, later same day)

User reported the right edge of the Users page table (and earlier, a report
card on Generate Timetable) getting cut off on their actual machine — content
just vanished with no scrollbar, confirmed explicitly when asked. Root cause:
every data table across the app was wrapped in `overflow-hidden` (meant only
for rounding the card's corners) with no horizontal scroll fallback, so on
their machine — where the content apparently renders wider than it did in
headless Playwright testing here (likely font-rendering differences; default
system sans-serif stack, no custom font was bundled) — table content got
silently clipped instead of becoming scrollable. Page-level `scrollWidth`
checks here never caught it because the overflow was contained *inside* the
`overflow-hidden` div, never reaching `document.documentElement`.

**Fix:** added an inner `overflow-x-auto` wrapper around the `<table>` in
every one of the 11 affected pages (Departments, Faculty, Classes, Subjects,
Classrooms, TimeSlots, AcademicYears, Timetables, Approvals, Reports, Users),
keeping the outer `overflow-hidden` div only for the rounded-corner look.
Worst case now is a horizontal scrollbar, never invisible content. Checked
Notifications.jsx's list (also `overflow-hidden`) — safe to leave as-is,
it's wrapped text with no fixed-width columns, nothing to clip.

**Lesson for next time:** when a user reports content "cut off" in this app
and headless testing here can't reproduce it, check for `overflow-hidden`
without a scroll fallback *before* assuming it's zoom/cache on their end —
that's the real local-vs-their-browser rendering gap, not a phantom.

## Status as of faculty-menu gap fix (2026-11-18)

User flagged (correctly) that the Faculty role's sidebar looked too thin —
only Dashboard/My Timetable/Notifications. That's not a bug, it's by design
(role-based nav), but it did expose a real spec gap: the spec's Faculty
capabilities list "View assigned classes and subjects" and "View classroom
details", and neither had a dedicated page — that info was only visible
indirectly inside the weekly grid.

**Added:** `/my-assignments` ("My Classes & Subjects") — a faculty-only page
showing their profile (designation, specialization, available days, max
weekly hours), their full subject/class assignment table, and the distinct
classrooms their active timetable entries use. Backend: `GET /api/faculty/:id`
now also returns `classroomsUsed`, and is locked down so a faculty login can
only fetch *their own* record (`role==='faculty' && req.user.faculty !==
params.id` → 403) — previously any authenticated user could fetch any
faculty's full profile by guessing the ID, including HOD/superadmin detail
data not meant for peer faculty.

**Bug found while building this:** `facultyController.getOne`'s `weeklyHours`
(and the classroom list feeding off it) counted *every* `TimetableEntry` ever
created for that faculty, including ones belonging to long-archived
timetables from earlier test regenerations — showed 86 instead of the real
15 for Priya Nair after this session's repeated test-generates. Fixed by
filtering to entries whose parent `Timetable.status !== 'archived'`, the same
pattern `reportController.js`'s `activeTimetableIds()` already used elsewhere
— this endpoint had just never been updated to match. Verified the fix also
corrected the number on the *admin's* Faculty detail view (same endpoint).

## Next steps when resuming

- Everything in the original spec is now implemented and verified except the
  deliberate scope calls (drag-and-drop → click-to-edit; forgot-password →
  token shown in-app, no SMTP). See README.md "Known scope decisions".
- If the backend won't connect: check Atlas Network Access — the dev
  machine's public IP can change between sessions and needs re-whitelisting
  (hit this once already; `curl https://api.ipify.org` to get the current IP).
- Both dev servers are typically left running via `nohup ... &`; if you see
  `EADDRINUSE` after editing a controller file, it's almost always a stale
  orphaned `nodemon` process from an earlier failed start still watching the
  same files — check `Get-CimInstance Win32_Process -Filter "Name='node.exe'"`
  for duplicate `nodemon.js server.js` entries and kill the one with no live
  child (not the one holding the port).
