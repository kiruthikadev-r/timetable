# Smart College Timetable Management System

Full-stack MERN app for generating, editing, approving and publishing college
timetables across departments, classes and faculty.

## Stack

- **Frontend:** React 18 + Vite 5, Tailwind CSS 3, React Router 6, Axios, Lucide React icons, Recharts, React Hot Toast, Context API for auth state.
- **Backend:** Node.js + Express, MongoDB Atlas via Mongoose, JWT + bcrypt auth, ExcelJS/PDFKit for report exports.

## Project layout

```
server/   Express API (models, controllers, routes, services, seed)
client/   React app (pages, components, context, api)
memory/   Project-specific continuity notes (not committed to chat memory)
```

## First-time setup

1. **Backend**
   ```
   cd server
   npm install
   copy .env.example .env   # then fill in MONGODB_URI and JWT_SECRET
   npm run seed             # wipes and re-seeds sample departments/faculty/classes
   npm run dev              # http://localhost:5131
   ```
2. **Frontend**
   ```
   cd client
   npm install
   npm run dev              # http://localhost:5250 (proxies /api to :5131)
   ```

## Seeded accounts (after `npm run seed`)

Password for every seeded account: `Passw0rd!123`

| Role | Email |
|---|---|
| Super Admin | admin@timetable.edu |
| HOD (Computer Science) | arvind.rao@timetable.edu |
| HOD (Computer Applications) | kavitha.iyer@timetable.edu |
| HOD (Commerce) | lakshmi.pillai@timetable.edu |
| Faculty (Computer Science) | priya.nair@timetable.edu |

## Core workflow

1. Super Admin sets up Time Slots/working days, Classrooms, Academic Years, Departments.
2. Super Admin/HOD add Faculty, Subjects, and Classes (with subject → faculty mapping).
3. Optionally set Faculty Availability exceptions.
4. Run **Generate Timetable** for a class, a department, or the whole college.
5. Review the generated grid, edit individual sessions if needed (day/period/faculty/classroom — conflicts are re-validated server-side on every edit).
6. Submit for approval → HOD approves or requests changes → Super Admin publishes.
7. Faculty see their own published weekly schedule under **My Timetable**; everyone sees notifications on publish/changes.

## Known scope decisions

- **Drag-and-drop** in the spec is implemented as click-a-session → edit modal (change day/period/faculty/classroom, or remove) with the same conflict validation a drag-and-drop UI would need. No visual drag library was added to keep the dependency list to what was explicitly requested.
- **Forgot password** has no SMTP configured, so the reset token is returned directly in the API response/UI instead of emailed.
- Lab/Practical subjects are scheduled in contiguous blocks of `durationSlots` periods; if `weeklyPeriods` isn't an exact multiple of `durationSlots`, the last block still uses the full block length (slightly more periods than the bare minimum) rather than splitting blocks unevenly.
