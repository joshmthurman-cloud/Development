# Curbstone Transaction Builder - Deployment Guide

## Overview
This is a web-based transaction builder application that requires:
- **Frontend**: React app built with Vite
- **Backend**: Node.js/Express server
- **Authentication**: Session-based with user management
- **Logging**: Writes to server LOGS folder

## Prerequisites

### Required Software
1. **Node.js** (v18 or higher recommended)
   - Download from: https://nodejs.org/
   - Install on the server
   - Verify installation: `node --version` and `npm --version`

### Server Requirements
- Windows Server (recommended) or Windows 10/11
- Port 3000 available for the backend API (or configure custom port)
- Port 80/443 for web access (if using reverse proxy)
- Write permissions for the application directory

## Installation Steps

### 1. Extract Files
Extract the `curbstone-tx` folder to the server location (e.g., `C:\apps\curbstone-tx` or `C:\inetpub\curbstone-tx`)

### 2. Install Dependencies
Open Command Prompt or PowerShell in the `curbstone-tx` folder and run:
```cmd
npm install
```

This will install all required packages (may take 2-5 minutes).

### 3. Build the Frontend
```cmd
npm run build
```

This creates the `dist` folder with the production-ready React app.

### 4. Configure Environment (Optional)

Create a `.env` file in the `curbstone-tx` folder (or set environment variables):

```env
# Server Port (default: 3000)
PORT=3000

# Logs Directory (default: ./LOGS in app folder)
LOGS_PATH=C:\apps\curbstone-tx\LOGS

# Session Secret (IMPORTANT: Change this in production!)
SESSION_SECRET=your-unique-secret-key-here-change-this

# Node Environment
NODE_ENV=production
```

**Important**: Change `SESSION_SECRET` to a strong random string (at least 32 characters) for security.

## Running the Application

### Development/Testing
```cmd
npm run dev:web
```
This runs both frontend dev server and backend (for testing only).

### Production
```cmd
node server.js
```

The server will:
- Start on port 3000 (or configured PORT)
- Serve the React app from the `dist` folder
- Create `LOGS` folder automatically
- Create `users.json` with default ADMIN user

**Default Admin Credentials:**
- Username: `ADMIN`
- Password: `p0okmju7yg`

**⚠️ IMPORTANT: Change the admin password immediately after first login!**

## Production Deployment Options

### Option 1: Run as Windows Service (Recommended)

Use **PM2** or **NSSM** to run as a Windows service:

#### Using NSSM (Non-Sucking Service Manager)
1. Download NSSM from: https://nssm.cc/download
2. Extract and run `nssm.exe install CurbstoneTX`
3. Configure:
   - **Path**: `C:\Program Files\nodejs\node.exe`
   - **Startup directory**: `C:\apps\curbstone-tx` (your app folder)
   - **Arguments**: `server.js`
4. Set to "Automatic" startup in Services

#### Using PM2
```cmd
npm install -g pm2
pm2 start server.js --name curbstone-tx
pm2 save
pm2 startup
```

### Option 2: IIS Reverse Proxy (Recommended for Production)

Set up IIS to proxy requests to the Node.js server:

1. **Install URL Rewrite and Application Request Routing** modules for IIS
2. **Create IIS Site** pointing to `C:\apps\curbstone-tx\dist` folder
3. **Configure Reverse Proxy**:
   - Create `web.config` in the `dist` folder (see below)
   - Or use IIS Manager → URL Rewrite → Reverse Proxy

**web.config** for `dist` folder:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="Proxy to Node.js" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://localhost:3000/api/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

4. **Configure Ports**:
   - IIS: Port 80 (or 443 for HTTPS)
   - Node.js: Port 3000 (internal, not exposed to internet)

### Option 3: Standalone (Simple)

Just run `node server.js` and access at `http://server-ip:3000`

**Note**: In this mode, the server serves both the frontend and API.

## Network Configuration

### Firewall Rules
Open the following ports:
- **Port 3000** (or your configured PORT) - if not using reverse proxy
- **Port 80/443** - if using IIS reverse proxy

### Access URLs
- **Direct**: `http://server-name:3000` or `http://server-ip:3000`
- **Via IIS**: `http://server-name` or `https://server-name` (if SSL configured)

## File Locations

### Application Files
- **Location**: `C:\apps\curbstone-tx` (or your chosen location)
- **Configuration**: `server.js`, `package.json`
- **Frontend Build**: `dist\` folder (created after `npm run build`)

### Data Files
- **User Database**: `users.json` (auto-created, contains all user accounts)
- **Transaction Logs**: `LOGS\` folder (auto-created)
  - Log files: `YYYYMMDD.jsonl` format (e.g., `20251104.jsonl`)
  - One file per day
  - All users' transactions in the same files

### Custom Logs Location
Set `LOGS_PATH` environment variable to use a network share or different location:
```cmd
set LOGS_PATH=\\server\logs\curbstone-tx
```

Or in PowerShell:
```powershell
[System.Environment]::SetEnvironmentVariable("LOGS_PATH", "\\server\logs\curbstone-tx", "Machine")
```

## Security Considerations

1. **Change Default Admin Password**
   - Log in as ADMIN
   - Go to User Management
   - Edit ADMIN user and change password

2. **Set Strong Session Secret**
   - Generate a random string (32+ characters)
   - Set in environment variable: `SESSION_SECRET`
   - Or create `.env` file with `SESSION_SECRET=your-secret-here`

3. **Firewall Configuration**
   - Only expose necessary ports
   - Consider using HTTPS (SSL certificate) for production

4. **User Management**
   - Only ADMIN users can create/modify users
   - Regular users can only change their own password
   - ADMIN can set transaction type permissions per user

## Maintenance

### Updating the Application
1. Stop the server/service
2. Replace application files (keep `users.json` and `LOGS` folder)
3. Run `npm install` (if dependencies changed)
4. Run `npm run build` (if frontend code changed)
5. Restart the server/service

### Backup Important Files
- `users.json` - Contains all user accounts
- `LOGS\` folder - Contains all transaction logs

### Monitoring
- Check server console/logs for errors
- Monitor `LOGS` folder for transaction activity
- Check `users.json` for user account changes

## Troubleshooting

### Server Won't Start
- Check Node.js is installed: `node --version`
- Check port 3000 isn't in use: `netstat -ano | findstr :3000`
- Check for errors in console output

### Users Can't Log In
- Verify `users.json` exists and has valid JSON
- Check server console for errors
- Verify session cookies are allowed in browser

### Logs Not Saving
- Check `LOGS` folder exists and is writable
- Check `LOGS_PATH` environment variable (if set)
- Check server console for file system errors

### Port Already in Use
- Change `PORT` in `.env` file or environment variable
- Or stop the service using port 3000

## Quick Start Commands

```cmd
# Install dependencies
npm install

# Build frontend
npm run build

# Run in production
node server.js

# Or set NODE_ENV
set NODE_ENV=production
node server.js
```

## Support Files

- `package.json` - Dependencies and scripts
- `server.js` - Backend Express server
- `vite.config.js` - Frontend build configuration
- `.gitignore` - Files to exclude from version control

## Notes

- The `node_modules` folder can be large but is required
- The `dist` folder is created by `npm run build` and contains the production frontend
- The `users.json` and `LOGS` folders are created automatically on first run
- All user data is stored in `users.json` (plain text JSON - keep secure!)
- All transaction logs are in `LOGS` folder (one file per day in JSONL format)






