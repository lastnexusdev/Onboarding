# Onboarding Repository Analysis

## What this project is

This repository is a **PHP + MySQL web application** for managing customer onboarding workflows.

It supports:
- user authentication and role-based access (`login.php`, `auth_check.php`)
- sales intake of new clients (`sales.php`)
- technician dashboards and progress tracking (`dashboard.php`, `fetch_dashboard_updates.php`)
- per-client onboarding detail/checklist management (`onboarding_detail.php`, `update_checklist.php`)
- admin settings and package/program configuration (`settings.php`)
- report views (`reports.php`)
- user management for admins (`users.php`)
- file uploads/chunked uploads (`upload.php`, `upload_chunk.php`)

## Primary roles and workflow

- **Admin**: broad access, can manage users and settings.
- **Sales**: adds clients, assigns techs, defines package/program setup.
- **Tech**: works assigned clients and completes onboarding checklist items.

Typical flow:
1. Sales creates client in `sales.php`.
2. Client is assigned to a tech and initialized with entitled programs.
3. Tech updates checklist/progress via detail/checklist endpoints.
4. Dashboard and reports aggregate progress and status.

## Data model (inferred from code)

The app appears to rely on tables like:
- `Users`
- `Onboarding`
- `OnboardingDetails`
- `EntitledPrograms`
- `CustomPackages`
- `Notification`
- `admin_settings`
- `LastAssignedTech`

## High-level architecture

- Classic server-rendered PHP pages with embedded HTML/CSS.
- Shared DB connection in `db.php`.
- Session-based auth with `$_SESSION` variables.
- Role checks implemented in page-level logic and optional `$requireRoles` in `auth_check.php`.
- Some AJAX-like JSON endpoints (e.g., `fetch_dashboard_updates.php`, `fetch_entitled_programs.php`).

## Notable technical observations

1. **Mixed security posture**
   - Many operations use prepared statements (good).
   - Some SQL uses direct session interpolation (e.g., dashboard stats filter), which should be converted to prepared statements for consistency.

2. **Credential handling issue**
   - DB credentials are hardcoded in `db.php` and include plaintext password in repo.
   - Should be moved to environment variables/secrets management immediately.

3. **Error/log configuration**
   - `display_errors` is enabled in `db.php`, which is unsafe for production.
   - Log paths in `db.php` are placeholder-like (`/path/to/your/log/file.log`), likely not operational.

4. **Session key duplication**
   - Both `user_id` and `userid` are used to support legacy code.
   - Works, but increases maintenance risk and inconsistency.

5. **Code organization**
   - Business logic, SQL, markup, and styles are heavily mixed inside page files.
   - Functional but harder to test and maintain than a layered architecture.

## Recommended next improvements

1. Move DB credentials/config to `.env` + loader and disable `display_errors` outside local dev.
2. Replace all dynamic SQL concatenation with parameterized queries.
3. Centralize authorization rules in one reusable helper.
4. Split view/controller/data logic to reduce file complexity.
5. Add baseline automated checks (PHP lint + smoke tests for critical endpoints).
