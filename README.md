# Property Management System

Phase 1 adds secure authentication and user management on top of the PHP backend and React frontend.
Phase 2 adds property management, property type management, property detail pages, and image uploads.
Phase 3 adds unit management with property linkage, status tracking, and rent/deposit fields.
Phase 4 adds tenant management with unit mapping, photo upload, and document upload.

## What is included

- `config/` for app, role, and security settings
- `includes/` for bootstrap, helpers, auth, DB, and layout rendering
- `api/` for JSON endpoints used by React
- `frontend/` for the Vite + React app
- `database/schema.sql` for the users table, property tables, unit tables, and security columns
- `setup/bootstrap_database.php` to create the database and import the schema
- `setup/seed_admin.php` to create the first owner account
- `setup/migrate_phase1_auth.php` to upgrade an existing phase 0 database
- `setup/migrate_phase2_properties.php` to add property tables to an existing phase 1 database
- `setup/migrate_phase3_units.php` to add unit tables to an existing phase 2 database
- `setup/migrate_phase4_tenants.php` to add tenant tables to an existing phase 3 database

## Setup

1. Create a MySQL database named `property_management` or update `config/database.php`.
2. Bootstrap the database and import the schema:
   ```powershell
   C:\xampp\php\php.exe setup\bootstrap_database.php
   ```
3. If you already have a phase 0 database, run the auth migration:
   ```powershell
   C:\xampp\php\php.exe setup\migrate_phase1_auth.php
   ```
4. If you already have a phase 1 database, run the property migration:
   ```powershell
   C:\xampp\php\php.exe setup\migrate_phase2_properties.php
   ```
5. If you already have a phase 2 database, run the unit migration:
   ```powershell
   C:\xampp\php\php.exe setup\migrate_phase3_units.php
   ```
6. If you already have a phase 3 database, run the tenant migration:
   ```powershell
   C:\xampp\php\php.exe setup\migrate_phase4_tenants.php
   ```
7. Configure Google OAuth in `.env`:
   ```env
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google-callback.php
   APP_FRONTEND_URL=http://localhost:5173/
   APP_POST_LOGIN_REDIRECT=http://localhost:5173/
   ```
8. Copy `frontend/.env.example` to `frontend/.env` if you want to override the API base URL.

## Run

Open two terminals.

Terminal 1: start the PHP API

```powershell
C:\xampp\php\php.exe -S localhost:8000 -t .
```

Terminal 2: start the React app

```powershell
cd frontend
npm install
npm run dev
```

Then open the Vite URL shown in Terminal 2, usually `http://localhost:5173`.

## Phase 1

- Google-only sign-in and logout
- First owner creation from the initial Google account when the database is empty
- Owner-driven manager/staff account creation
- Session hardening and login lockouts
- Profile update, password change, and photo upload
- Server-side role permissions

## Phase 2

- Property add, edit, delete, and list view
- Property detail page with image gallery
- Property image upload and deletion
- Property type add, edit, delete, and list management
- Dashboard property counts and availability summary

## Phase 3

- Unit add, edit, delete, and list view
- Unit status management
- Unit-to-property linking
- Rent amount and security deposit fields
- Dashboard unit counts and availability summary

## Phase 4

- Tenant add, edit, delete, and details save
- Tenant photo upload
- Tenant document upload
- Tenant-to-unit mapping
- Dashboard tenant counts and assignment summary

## API

- `GET /api/auth/me.php`
- `POST /api/auth/login.php`
- `POST /api/auth/register.php`
- `POST /api/auth/logout.php`
- `GET /api/dashboard/summary.php`
- `GET /api/users/list.php`
- `POST /api/users/create.php`
- `POST /api/users/profile.php`
- `POST /api/users/password.php`
- `POST /api/users/photo.php`
- `GET /api/properties/list.php`
- `GET /api/properties/view.php`
- `POST /api/properties/create.php`
- `POST /api/properties/update.php`
- `POST /api/properties/delete.php`
- `POST /api/properties/image-upload.php`
- `POST /api/properties/image-delete.php`
- `GET /api/units/list.php`
- `GET /api/units/view.php`
- `POST /api/units/create.php`
- `POST /api/units/update.php`
- `POST /api/units/delete.php`
- `GET /api/tenants/list.php`
- `GET /api/tenants/view.php`
- `POST /api/tenants/create.php`
- `POST /api/tenants/update.php`
- `POST /api/tenants/delete.php`
- `POST /api/tenants/photo.php`
- `POST /api/tenants/document-upload.php`
- `POST /api/tenants/document-delete.php`
- `GET /api/property-types/list.php`
- `POST /api/property-types/create.php`
- `POST /api/property-types/update.php`
- `POST /api/property-types/delete.php`

## Notes

- React talks to the PHP backend through a Vite proxy.
- PHP still owns sessions, authentication, and role checks.
- `pages/` remains in the repo for backward compatibility, but the React app is the main UI now.
