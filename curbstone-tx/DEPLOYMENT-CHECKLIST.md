# Deployment Checklist

## What to Include in the ZIP File

✅ **Include these files/folders:**
- `src/` - Source code (React components)
- `server.js` - Backend server
- `package.json` - Dependencies list
- `package-lock.json` - Locked dependency versions
- `vite.config.js` - Build configuration
- `tailwind.config.cjs` - Tailwind CSS config
- `postcss.config.cjs` - PostCSS config
- `index.html` - HTML entry point
- `DEPLOYMENT-GUIDE.md` - Full deployment instructions
- `QUICK-START.md` - Quick reference guide
- `README.md` - General information

❌ **DO NOT include these (will be created/installed):**
- `node_modules/` - Install with `npm install`
- `dist/` - Created with `npm run build`
- `LOGS/` - Created automatically on first run
- `users.json` - Created automatically on first run
- `.env` - Can be created by network manager if needed
- `.git/` - Version control (if present)

## Pre-Deployment Checklist

Before sending the ZIP:

- [ ] Remove `node_modules` folder (if present)
- [ ] Remove `dist` folder (if present) 
- [ ] Remove `LOGS` folder (if present)
- [ ] Remove `users.json` (if present - will be auto-created)
- [ ] Verify `DEPLOYMENT-GUIDE.md` is included
- [ ] Verify `QUICK-START.md` is included
- [ ] Test that ZIP extracts correctly

## Post-Deployment Verification

After deployment, verify:

- [ ] Server starts without errors
- [ ] Can access `http://server:3000` in browser
- [ ] Login page appears
- [ ] Can log in with ADMIN credentials
- [ ] `LOGS` folder is created automatically
- [ ] `users.json` is created automatically
- [ ] Can create new users (as ADMIN)
- [ ] Transactions save to LOGS folder

## Network Manager Checklist

The network manager should:

1. [ ] Install Node.js (v18+)
2. [ ] Extract ZIP to server location
3. [ ] Run `npm install`
4. [ ] Run `npm run build`
5. [ ] Configure environment variables (optional)
6. [ ] Test `node server.js` starts successfully
7. [ ] Set up as Windows Service (NSSM or Task Scheduler)
8. [ ] Configure firewall rules
9. [ ] Set up IIS reverse proxy (optional, recommended)
10. [ ] Change default ADMIN password
11. [ ] Test access from network computers
12. [ ] Document server location and access URL

## Important Notes

- **Default Admin Password**: `p0okmju7yg` - MUST be changed after deployment
- **Port**: Default is 3000, can be changed via `PORT` environment variable
- **Logs Location**: Default is `./LOGS` in app folder, can be changed via `LOGS_PATH`
- **Session Secret**: Should be set in production for security
- **User Data**: Stored in `users.json` - keep secure and backed up
- **Transaction Logs**: Stored in `LOGS/` folder - one file per day






