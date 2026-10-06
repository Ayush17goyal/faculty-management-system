# Faculty Management System

![Faculty Management System cover](assets/faculty-management-cover.png)

A role-aware DBMS web application for managing faculty records, departments, academic schedules, course allocation, and institutional administration from one central portal.

## Highlights

- Single username-and-password login that opens the correct workspace automatically.
- Role-aware portals for Admin, HOD, Faculty, Director, Vice President, and President.
- Faculty, department, HOD, timetable, and user management.
- Faculty career-history search with appointment timelines, including academic and administrative roles such as Assistant Professor, Dean, and Vice Chancellor.
- Admin dashboard with live faculty-record and designation charts.
- SQLite relational database with normalized tables, primary keys, foreign keys, and CRUD workflows.

## Technology

| Layer | Tools |
|---|---|
| Backend | Node.js, Express |
| Database | SQLite, SQL |
| Frontend | HTML, CSS, JavaScript |
| Authentication | Cookie-based sessions with role-aware access control |

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

## Demo accounts

The portal detects the role from the login ID, so role selection is not required.

| Login ID | Password | Workspace |
|---|---|---|
| `admin` | `admin` | Admin |
| `rahul01` | `rahul123` | HOD |
| `amit01` | `amit123` | Faculty |
| `director01` | `director123` | Director |
| `vp01` | `vp123` | Vice President |
| `president01` | `president123` | President |

## Faculty history search

From the Admin sidebar, open **Faculty History** and search by faculty name or ID. Example searches:

- Rahul Sharma — Lecturer → Assistant Professor → Associate Professor → Professor & HOD
- Arun Joshi — Assistant Professor → Associate Professor → Professor → Dean, Academic Affairs
- Nisha Jain — Assistant Professor → Associate Professor → Professor & Dean → Vice Chancellor

## Database design

The database includes `departments`, `faculty`, `faculty_career_history`, `users`, `courses`, `faculty_courses`, `assignments`, `attendance`, and `timetable` tables. The schema and seeded records are available in [schema.sql](schema.sql).

## Project structure

```text
FMS-3/
├── assets/                 # README cover image
├── views/                  # Portal templates
├── server.js               # Express routes and access control
├── view_engine.js          # Template rendering
├── db.js                   # SQLite setup
└── schema.sql              # Schema and sample institutional records
```
