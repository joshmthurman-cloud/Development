# Password reset & change password – server deployment

This document lists what was added for **forgot password** (link-based reset) and **change password** (when logged in), and what to update on the server.

## What was added

### 1. Database
- **New table:** `password_reset_tokens`  
  - Created automatically on next app startup (`init_db()` runs at startup and creates any missing tables).  
  - No manual migration needed unless you run migrations explicitly; then add a migration for `PasswordResetToken`.

### 2. New files (upload these)
- `app/models.py` – added `PasswordResetToken` model.
- `app/services/password_reset.py` – **new file**: token create/verify/invalidate.
- `app/main.py` – new routes and `PasswordResetToken` import.
- `app/templates/forgot_password.html` – **new**: “Forgot password” form.
- `app/templates/reset_password.html` – **new**: “Set new password” form (from email link).
- `app/templates/change_password.html` – **new**: “Change password” form (when logged in).
- `app/templates/login.html` – “Forgot password?” link and success/error messages.
- `app/templates/base.html` – “Change password” link in header when logged in.

### 3. Routes (no config needed)
- `GET  /forgot-password` – show “Forgot password” form.
- `POST /forgot-password` – submit email; send reset link if user exists (same message either way).
- `GET  /reset-password?token=...` – show “Set new password” form (valid token required).
- `POST /reset-password` – set new password and invalidate token; redirect to login.
- `GET  /change-password` – show “Change password” form (requires login).
- `POST /change-password` – update password when logged in (current + new + confirm).

### 4. Environment
- Uses existing `BASE_URL` for the reset link in the email (e.g. `http://10.200.0.235:8091`).  
- Uses existing email config (`EmailService` / SendGrid or SMTP). No new env vars.

## Server steps

1. **Upload** the new/updated files under your app directory (same structure as in the repo).
2. **Restart** the app (e.g. `sudo systemctl restart status-monitor.service` or your usual method).
3. **Check** that the app starts; the `password_reset_tokens` table will be created on first startup.
4. **Test**
   - From login page: “Forgot password?” → enter email → check email → open link → set new password → login.
   - When logged in: “Change password” in header → current password + new password → submit.

## Security notes

- Reset link token is stored **hashed** (SHA-256); raw token only in the email link.
- Token expires in **1 hour** and is **single-use** (marked used after successful reset).
- No indication whether an email exists; same message for any submitted email on forgot-password.
