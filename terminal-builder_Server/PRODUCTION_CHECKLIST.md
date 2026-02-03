# Production Deployment Checklist

## Pre-Deployment Checklist

### Files Created/Updated
- ✅ `server/server.js` - Updated to bind to 0.0.0.0 and handle production CORS
- ✅ `server/env.production.template` - Environment variable template
- ✅ `terminal-builder.service` - Systemd service file for Ubuntu
- ✅ `deploy.sh` - Automated deployment script
- ✅ `DEPLOYMENT.md` - Full deployment documentation
- ✅ `QUICK_START_PRODUCTION.md` - Quick reference guide
- ✅ `package.json` - Added production scripts

### Configuration Changes
- ✅ Server binds to `0.0.0.0:8092` (all interfaces)
- ✅ CORS configured for production with flexible origin handling
- ✅ Session security enabled for production (secure cookies)
- ✅ Static file serving configured for production builds

## Server Requirements

- [ ] Ubuntu 24.04.3 LTS
- [ ] Node.js v18+ installed
- [ ] npm installed
- [ ] Port 8092 available
- [ ] Firewall configured (if applicable)

## Deployment Steps

1. [ ] Transfer files to `/opt/terminal-builder` on server
2. [ ] Run `./deploy.sh` script
3. [ ] Review and update `.env` file in `server/` directory
4. [ ] Update `terminal-builder.service` with correct username
5. [ ] Install systemd service
6. [ ] Start and enable service
7. [ ] Configure firewall (if needed)
8. [ ] Test application at `http://10.200.0.235:8092`
9. [ ] Change default admin password

## Post-Deployment Verification

- [ ] Service is running: `sudo systemctl status terminal-builder`
- [ ] Health check works: `curl http://10.200.0.235:8092/api/health`
- [ ] Application loads in browser
- [ ] Can log in with default credentials
- [ ] Database is accessible
- [ ] File uploads work
- [ ] STEAM API connections work

## Security Checklist

- [ ] Strong `SESSION_SECRET` generated and set
- [ ] Default admin password changed
- [ ] `.env` file has correct permissions (600)
- [ ] Database file has correct permissions
- [ ] Firewall rules configured
- [ ] Service runs as non-root user
- [ ] HTTPS configured (if applicable)

## Monitoring

- [ ] Logs accessible: `sudo journalctl -u terminal-builder -f`
- [ ] Application logs in `server/logs/` directory
- [ ] Error monitoring set up (if applicable)

## Backup Strategy

- [ ] Database backup location: `server/data/terminal-builder.db`
- [ ] Upload files location: `server/uploads/`
- [ ] Backup schedule established

## Notes

- Default login: `Admin` / `Admin` (CHANGE IMMEDIATELY)
- Application URL: `http://10.200.0.235:8092`
- Service name: `terminal-builder`
- Working directory: `/opt/terminal-builder`
