# v1 Feature Parity Checklist (Design + Functionality)

This checklist tracks coverage from the original PHP app files:

- `login.php` → themed login page with role-based session boot.
- `dashboard.php` + `fetch_dashboard_updates.php` → dashboard stats, per-tech tables, progress bars, status badges.
- `sales.php` → full intake form (client assignment, package, conversion/bank/spanish flags, notes).
- `edit_client.php` + `client_details.php` + `onboarding_detail.php` + `update_checklist.php` + `update_client_status.php` → detail page with checklist toggles, notes/callouts, status actions, entitled program editing, upload token regeneration, history table.
- `remove_client.php` → bulk multi-select delete in clients table.
- `fetch_entitled_programs.php` → dedicated programs fetch/update endpoints.
- `users.php` → user create/list/update/delete.
- `settings.php` → software-release toggle + custom package create/delete/list.
- `reports.php` → status summary, tech assignment, package mix.
- `History.php` → standalone history manager page for edit/delete by client.
- `upload.php` + `upload_chunk.php` → single/chunk upload endpoints retained in backend.

Notes:
- UI has been restyled toward the original visual design language (top brand bar, card-based stats, large table views, texture background).
- Remaining improvements are mostly fine-grained UX polish and role-specific visibility rules.
