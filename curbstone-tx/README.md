# Curbstone Transaction Builder

A web-based transaction builder application for building and sending Curbstone gateway requests. Supports multiple users with role-based access control and centralized server-side logging.

## Quick Start (Development)

1. Install **Node.js LTS** from nodejs.org if you don't already have it.
2. Extract this zip, then in the folder run:
   ```bash
   npm install
   npm run dev:web
   ```
3. Open `http://localhost:5173` in your browser.
4. Log in with:
   - Username: `ADMIN`
   - Password: `p0okmju7yg`

## Production Deployment

See `DEPLOYMENT-GUIDE.md` for complete deployment instructions.

**Quick deployment steps:**
1. Install Node.js on server
2. Extract application files
3. Run `npm install`
4. Run `npm run build`
5. Run `node server.js`
6. Access at `http://server:3000`

## Features

- **User Authentication**: Login system with session management
- **User Management**: ADMIN users can create and manage users
- **Transaction Type Permissions**: ADMIN can restrict transaction types per user
- **Centralized Logging**: All transactions logged to server LOGS folder
- **Session Timeout**: Automatic logout after 10 minutes of inactivity
- **Multiple Users**: Supports concurrent users with separate sessions

## Default Admin Credentials

- **Username**: `ADMIN`
- **Password**: `p0okmju7yg`

⚠️ **IMPORTANT**: Change the admin password immediately after first login!

## Notes

- Default tax is calculated as a rate; switch to a fixed amount in **Properties**.
- Set default `AuthKey` and `RegisterId` in **Properties**, then click **Apply defaults to form**.
- For **Capture / Reversal / Return**, you can type the MFUKEY (RefId) of the prior transaction.
- All transactions are automatically saved to the server LOGS folder.
