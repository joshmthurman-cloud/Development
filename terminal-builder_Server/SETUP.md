# Terminal Builder Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   # Root dependencies
   npm install

   # Server dependencies
   cd server
   npm install

   # Client dependencies
   cd ../client
   npm install
   ```

2. **Configure environment:**
   - Copy `server/.env.example` to `server/.env`
   - Update STEAM API credentials in `.env`:
     ```
     STEAM_USERNAME=apihandler
     STEAM_PASSWORD=gitBMk!qhKqR&KC5
     STEAM_API_URL=https://dvmms.com/steam/api/ws/VDirectAccess.asmx
     ```

3. **Run the application:**
   ```bash
   # From root directory
   npm run dev
   ```
   This starts both server (port 3000) and client (port 5173)

   Or run separately:
   ```bash
   # Server only
   npm run dev:server

   # Client only (in another terminal)
   npm run dev:client
   ```

4. **Access the application:**
   - Open browser to `http://localhost:5173`
   - Login with: `Admin` / `Admin`

## Features

- **Single VAR Upload**: Upload and process one VAR sheet at a time
- **Batch Processing**: Upload and process multiple VAR sheets
- **Template Selection**: Choose from available STEAM templates
- **Field Mapping**: Review and edit mapped fields before TPN creation
- **Processing History**: View all processed VAR sheets and their status

## Workflow

1. Upload VAR sheet (PDF)
2. System extracts data and maps to STEAM fields
3. Select template from STEAM
4. Review and edit mapped fields
5. Enter TPN and create terminal in STEAM
6. View results and history

## Configuration

### STEAM API Settings
- Configure in `server/.env` or through the UI (if implemented)
- Production endpoint: `https://dvmms.com/steam/api/ws/VDirectAccess.asmx`
- Default username: `apihandler`

### Default Fields
- Contactless_Signature: Off (can be changed to On Credit, On Debit, On Both)
- KeyManagement_RKL_Device_GroupName: (user input)
- Merchant_Time_Zone: (extracted from VAR or user input)

## Troubleshooting

### Database Issues
- Database is created automatically on first run
- Location: `server/data/terminal-builder.db`
- Default admin user is created automatically

### PDF Parsing Issues
- Ensure PDF is not password protected
- Check that PDF contains text (not just images)
- Verify VAR sheet format matches TSYS format

### STEAM API Issues
- Verify credentials in `.env`
- Check network connectivity to STEAM endpoint
- Review logs in `server/logs/` directory

## Production Deployment

1. Build the client:
   ```bash
   cd client
   npm run build
   ```

2. Set environment variables:
   - `NODE_ENV=production`
   - `SESSION_SECRET` (use a strong random string)
   - STEAM API credentials

3. Run server:
   ```bash
   npm start
   ```

4. Server will serve the built client from `client/dist`


