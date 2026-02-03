# Production Troubleshooting Guide

## Issue: "Failed to load STEAM field names: Network Error"

### Check 1: Verify steam-fields.json exists
```bash
ls -la /home/josh/Dev/terminal-builder_Server/server/data/steam-fields.json
```

If it doesn't exist, copy it from your development machine or check if there's a backup:
```bash
ls -la /home/josh/Dev/terminal-builder_Server/server/data/
```

### Check 2: Verify file permissions
```bash
# Make sure the data directory is readable
chmod -R 755 /home/josh/Dev/terminal-builder_Server/server/data
chmod 644 /home/josh/Dev/terminal-builder_Server/server/data/steam-fields.json
```

### Check 3: Test the endpoint directly
```bash
# First, get a session cookie by logging in, then:
curl -v http://localhost:8092/api/var/steam-fields \
  -H "Cookie: connect.sid=<your-session-cookie>"
```

Or test with the browser's developer tools (Network tab) to see the actual error.

### Check 4: Check server logs
The server should log when the endpoint is hit. Look for:
- `[Get STEAM Fields] Attempting to read file:`
- `[Get STEAM Fields] File does not exist:`
- `[Get STEAM Fields] Error:`

## Issue: Upload Failures

### Check 1: Verify uploads directory exists
```bash
ls -la /home/josh/Dev/terminal-builder_Server/server/uploads
```

### Check 2: Verify uploads directory permissions
```bash
# Make sure the uploads directory is writable
chmod -R 755 /home/josh/Dev/terminal-builder_Server/server/uploads
```

### Check 3: Check server logs for upload errors
Look for:
- `[VAR Upload]` log messages
- File permission errors
- Multer errors

## Issue: No Terminal Logging

### Enable More Verbose Logging
The server should log all requests. If you're not seeing logs:

1. Check if the server is actually receiving requests:
   ```bash
   # In another terminal, watch the server output
   tail -f /path/to/server/logs/*.txt
   ```

2. Check browser console for CORS errors or network failures

3. Verify the server is actually running:
   ```bash
   ps aux | grep "node server.js"
   ```

## Quick Diagnostic Commands

```bash
# Check if server is running
ps aux | grep "node server.js"

# Check if port 8092 is listening
sudo netstat -tulpn | grep 8092

# Test health endpoint
curl http://localhost:8092/api/health

# Check file permissions
ls -la /home/josh/Dev/terminal-builder_Server/server/data/
ls -la /home/josh/Dev/terminal-builder_Server/server/uploads/

# Check server logs directory
ls -la /home/josh/Dev/terminal-builder_Server/server/logs/ | tail -20
```
