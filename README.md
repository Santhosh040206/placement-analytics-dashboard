# Campus Placement Analytics

Static, browser-only web app. No server, no build step — just open `index.html`.

## Roles
- **Student** — self-register, then submit/update your placement record.
- **Recruiter / Company** — post offers extended to students.
- **Admin** — add/edit/delete any record, bulk-import CSV, export, seed demo data.

## Demo admin
- Email: `admin@campus.edu`
- Password: `admin123`

## CSV format
Header row required:
```
name,branch,cgpa,status,company,package
```
`status` is either `Placed` or `Not placed`.

## Data
Everything is stored in browser `localStorage` under the keys `cpa_users`, `cpa_students`, `cpa_session`. Clearing site data resets the app.
