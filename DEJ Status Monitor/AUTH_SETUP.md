# Authentication Setup Guide

This guide will help you set up user authentication and authorization for the Terminal Status Monitor.

## Prerequisites

1. Python 3.11+ installed
2. Virtual environment activated
3. All dependencies installed (run `pip install -r requirements.txt`)

## Setup Steps

### 1. Install New Dependencies

The authentication system requires additional packages. Install them:

```bash
pip install -r requirements.txt
```

This will install:
- `python-jose[cryptography]` - For JWT token handling
- `passlib[bcrypt]` - For password hashing

### 2. Create Database Tables

Run the migration script to create the authentication tables:

```bash
python migrate_add_auth.py
```

This creates:
- `users` table - Stores user accounts
- `user_merchants` table - Maps users to their accessible merchants
- `email_notifications` table - Stores email notification preferences

### 3. Create Your First Admin User

Run the admin creation script:

```bash
python create_admin.py
```

Enter:
- Your email address (e.g., `josh@curbstone.com`)
- A secure password (minimum 8 characters)

This creates an admin account that can:
- Approve new user registrations
- Assign merchants to users
- Control Steam/Denovo view access
- Access all merchants and terminals

### 4. Configure Email Notifications (Optional)

Create a `.env` file in the project root with the following:

```env
# Secret key for JWT tokens and session management
# Generate a random string: python -c "import secrets; print(secrets.token_urlsafe(32))"
SECRET_KEY=your-random-secret-key-here

# Email notification settings
NOTIFICATION_EMAIL=josh@curbstone.com
NOTIFICATION_EMAIL_PASSWORD=your-app-password-here

# SMTP settings (defaults to Office 365)
SMTP_SERVER=smtp.office365.com
SMTP_PORT=587
```

**Important for Microsoft/Office 365:**
- You may need to create an "App Password" instead of using your regular password
- Go to: https://account.microsoft.com/security > Advanced security options > App passwords
- Generate a new app password and use that in `NOTIFICATION_EMAIL_PASSWORD`

### 5. Start the Application

```bash
python run.py
```

The application will now require login to access.

## User Management

### User Registration Flow

1. Users visit `/register` to create an account
2. They enter their email and password
3. Account is created but **inactive** (requires admin approval)
4. Admin receives notification (if email is configured)
5. Admin approves the user via admin panel
6. User can now log in

### Admin Functions

As an admin, you can:

1. **Approve Users**: View pending users at `/api/admin/pending-users` and approve them
2. **Assign Merchants**: Use `/api/admin/assign-merchants/{user_id}` to restrict which merchants a user can see
3. **Control Steam Access**: Use `/api/admin/toggle-steam-access/{user_id}` to enable/disable Steam/Denovo button visibility

### Merchant Access Control

- **Admin users**: See all merchants and terminals
- **Regular users**: Only see merchants assigned to them
- Merchants are identified by the first 4 digits of the TPN (e.g., TPN `044380269001` belongs to merchant `0443`)

### Steam/Denovo Button Visibility

The "View in STEAM" and "View in Denovo" buttons are only visible to:
- Admin users (always visible)
- Users with `can_view_steam=True` permission (set by admin)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login (returns JWT token)
- `GET /api/auth/me` - Get current user info
- `GET /login` - Login page
- `GET /register` - Registration page
- `GET /logout` - Logout

### Admin Only
- `GET /api/admin/pending-users` - List users pending approval
- `POST /api/admin/approve-user/{user_id}` - Approve a user
- `POST /api/admin/assign-merchants/{user_id}` - Assign merchants to user
- `POST /api/admin/toggle-steam-access/{user_id}` - Toggle Steam view access

## Navigation Updates

- **Terminal Status Monitor** header now links to home page (`/`)
- **Merchant view page**: Merchant name is clickable to return to home
- **User profile**: Shows email and admin status in header
- **Logout button**: Available in header when logged in

## Troubleshooting

### "Account pending approval" error
- User needs admin approval. Admin should run approval endpoint or use admin panel.

### "Access denied to this merchant" error
- User doesn't have access to the requested merchant. Admin needs to assign merchant access.

### Email notifications not working
- Check `.env` file has correct credentials
- For Microsoft accounts, ensure you're using an App Password, not your regular password
- Check SMTP server and port settings

### Can't log in after creating admin
- Ensure you ran `migrate_add_auth.py` first
- Check that the user was created successfully
- Verify password was hashed correctly

## Security Notes

1. **SECRET_KEY**: Change the default SECRET_KEY in production! Generate a secure random string.
2. **Password Storage**: Passwords are hashed using bcrypt - never stored in plain text.
3. **Session Management**: Uses JWT tokens stored in session cookies.
4. **HTTPS**: In production, always use HTTPS to protect session cookies.

## Next Steps

1. Set up email notifications for metric thresholds (admin-only feature)
2. Configure merchant assignments for each user
3. Set Steam/Denovo access permissions as needed
