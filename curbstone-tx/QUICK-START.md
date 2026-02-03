# Quick Start Guide for Network Manager

## Minimum Steps to Get Running

1. **Install Node.js** (if not already installed)
   - Download from https://nodejs.org/
   - Install with default settings

2. **Extract and Navigate**
   ```cmd
   cd C:\apps\curbstone-tx
   ```

3. **Install Dependencies**
   ```cmd
   npm install
   ```

4. **Build the Application**
   ```cmd
   npm run build
   ```

5. **Start the Server**
   ```cmd
   node server.js
   ```

6. **Access the Application**
   - Open browser to: `http://localhost:3000` or `http://server-ip:3000`
   - Log in with:
     - Username: `ADMIN`
     - Password: `p0okmju7yg`

## To Run as a Service (Automatic Startup)

### Option A: Using NSSM (Recommended for Windows)
1. Download NSSM: https://nssm.cc/download
2. Run: `nssm.exe install CurbstoneTX`
3. Set:
   - Path: `C:\Program Files\nodejs\node.exe`
   - Startup directory: `C:\apps\curbstone-tx`
   - Arguments: `server.js`
4. Start service from Services manager

### Option B: Using Task Scheduler
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: When computer starts
4. Action: Start a program
   - Program: `C:\Program Files\nodejs\node.exe`
   - Arguments: `server.js`
   - Start in: `C:\apps\curbstone-tx`

## Configuration

### Change Logs Location
Set environment variable:
```cmd
set LOGS_PATH=\\server\logs\curbstone-tx
```

### Change Server Port
Set environment variable:
```cmd
set PORT=8080
```

Or create `.env` file:
```
PORT=8080
LOGS_PATH=\\server\logs\curbstone-tx
SESSION_SECRET=change-this-to-a-random-string
```

## Important Files

- **users.json** - User accounts (auto-created, keep backup!)
- **LOGS/** - Transaction logs (auto-created)
- **server.js** - Main server file
- **dist/** - Frontend files (created after `npm run build`)

## Default Admin
- Username: `ADMIN`
- Password: `p0okmju7yg`
- **Change this immediately after first login!**






