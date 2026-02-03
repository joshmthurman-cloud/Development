# Electron Deployment Guide

This app runs as a desktop application using Electron, which allows automatic log file writing **without browser permission prompts**.

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run in development mode:**
   ```bash
   npm run electron:dev
   ```
   This will start the Vite dev server and launch Electron.

## Production Build

1. **Build the Windows installer:**
   ```bash
   npm run electron:build:win
   ```

2. **Installation:**
   - The installer will be in the `release` folder
   - Install the app to `C:\curbstone-tx` on each workstation (or your preferred location)
   - The `LOGS` folder will be automatically created in that directory

## Deployment for Multiple Users

### Option 1: Local Installation (Each Workstation)
- Install the Electron app on each customer service rep's computer
- Each installation writes to its local `C:\curbstone-tx\LOGS` folder
- Logs are separated by workstation

### Option 2: Network Share Logs (Recommended for Shared Logs)
- Install the Electron app on each workstation
- Create a shared `LOGS` folder on your network (e.g., `\\server\logs\curbstone-tx`)
- Set the `LOGS_PATH` environment variable on each workstation to point to the network share:
  ```powershell
  # Windows: Set user environment variable
  [System.Environment]::SetEnvironmentVariable("LOGS_PATH", "\\server\logs\curbstone-tx", "User")
  ```
- Or create a shortcut that sets the environment variable:
  ```cmd
  set LOGS_PATH=\\server\logs\curbstone-tx && "C:\curbstone-tx\electron.exe"
  ```
- All users' transactions will write to the same shared log files

### Option 3: Network Share App (Single Installation)
- Install the Electron app once on a network share (e.g., `\\server\apps\curbstone-tx`)
- Create a shared `LOGS` folder on the network (e.g., `\\server\logs\curbstone-tx`)
- Modify `electron-main.js` to use a fixed network path
- Users run the app from the network share
- All users' transactions write to the same shared log files

### Option 4: Host as Web App with Backend
If you prefer to host it as a web app on your network:
- Deploy the built React app to a web server (IIS, Apache, etc.)
- Add a backend API endpoint that writes logs to a shared location
- Update the React app to call the API instead of using Electron

## Log File Structure

- **Location:** `C:\curbstone-tx\LOGS\` (or configured `LOGS_PATH`)
- **Format:** `YYYYMMDD.jsonl` (e.g., `20250115.jsonl`)
- **Content:** One JSON object per line (JSONL format)
- **Append:** All transactions automatically append to the current day's file
- **Concurrent Writes:** Safe for multiple users writing simultaneously (Windows `appendFile` is atomic)

## Features

- ✅ **No permission prompts** - Direct file system access via Electron
- ✅ **Automatic log file creation** - Creates LOGS folder and files automatically
- ✅ **Date-based file naming** - One file per day
- ✅ **Concurrent writes** - Multiple users can write to the same file safely
- ✅ **Network share support** - Can write to network shares via `LOGS_PATH` environment variable

## Running the App

### Development:
```bash
npm run electron:dev
```

### Production (after building):
```bash
npm run electron
```

Or double-click the installed application.

## Configuration

### Set Custom Logs Path (Network Share)

**Windows - User Environment Variable:**
```powershell
[System.Environment]::SetEnvironmentVariable("LOGS_PATH", "\\server\logs\curbstone-tx", "User")
```

**Windows - System Environment Variable (requires admin):**
```powershell
[System.Environment]::SetEnvironmentVariable("LOGS_PATH", "\\server\logs\curbstone-tx", "Machine")
```

**Via Shortcut:**
Create a shortcut with target:
```cmd
cmd /c "set LOGS_PATH=\\server\logs\curbstone-tx && \"C:\curbstone-tx\Curbstone Transaction Builder.exe\""
```
