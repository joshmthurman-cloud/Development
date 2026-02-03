# Production Deployment Guide

## Server Information
- **OS**: Ubuntu 24.04.3 LTS
- **IP**: 10.200.0.235
- **Port**: 8092

## Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **npm** (comes with Node.js)

3. **Create application directory**
   ```bash
   sudo mkdir -p /opt/terminal-builder
   sudo chown $USER:$USER /opt/terminal-builder
   ```

## Deployment Steps

### 1. Transfer Files to Server

From your development machine:
```bash
# Create a tarball (excluding node_modules and logs)
tar --exclude='node_modules' \
    --exclude='server/node_modules' \
    --exclude='client/node_modules' \
    --exclude='server/logs' \
    --exclude='.git' \
    -czf terminal-builder.tar.gz .

# Transfer to server (replace with your method)
scp terminal-builder.tar.gz user@10.200.0.235:/opt/terminal-builder/
```

On the server:
```bash
cd /opt/terminal-builder
tar -xzf terminal-builder.tar.gz
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install --production

# Install client dependencies
cd ../client
npm install
```

### 3. Build Client

```bash
cd /opt/terminal-builder
npm run build
```

### 4. Configure Environment

```bash
cd /opt/terminal-builder/server
cp .env.production.example .env
nano .env  # Edit with your production values
```

**Important**: Generate a strong SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Initialize Database

The database will be automatically created on first run, but you can verify:
```bash
cd /opt/terminal-builder/server
node -e "import('./config/database.js').then(m => m.initDatabase())"
```

### 6. Set Up Systemd Service

Copy the service file:
```bash
sudo cp /opt/terminal-builder/terminal-builder.service /etc/systemd/system/
```

Edit if needed:
```bash
sudo nano /etc/systemd/system/terminal-builder.service
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable terminal-builder
sudo systemctl start terminal-builder
```

Check status:
```bash
sudo systemctl status terminal-builder
```

View logs:
```bash
sudo journalctl -u terminal-builder -f
```

### 7. Configure Firewall (if needed)

```bash
sudo ufw allow 8092/tcp
sudo ufw reload
```

### 8. Verify Deployment

1. Check service is running: `sudo systemctl status terminal-builder`
2. Test health endpoint: `curl http://10.200.0.235:8092/api/health`
3. Access application: `http://10.200.0.235:8092`

## Default Login

- Username: `Admin`
- Password: `Admin`

**⚠️ IMPORTANT**: Change the default admin password after first login!

## Maintenance

### View Logs
```bash
# Systemd logs
sudo journalctl -u terminal-builder -f

# Application logs
tail -f /opt/terminal-builder/server/logs/*.txt
```

### Restart Service
```bash
sudo systemctl restart terminal-builder
```

### Stop Service
```bash
sudo systemctl stop terminal-builder
```

### Update Application

1. Stop service: `sudo systemctl stop terminal-builder`
2. Backup database: `cp server/data/terminal-builder.db server/data/terminal-builder.db.backup`
3. Transfer new files
4. Install dependencies: `npm install` (in root, server, and client)
5. Rebuild client: `npm run build`
6. Start service: `sudo systemctl start terminal-builder`

## File Permissions

Ensure proper permissions:
```bash
sudo chown -R $USER:$USER /opt/terminal-builder
chmod -R 755 /opt/terminal-builder
chmod 600 /opt/terminal-builder/server/.env
```

## Troubleshooting

### Service won't start
- Check logs: `sudo journalctl -u terminal-builder -n 50`
- Verify .env file exists and has correct values
- Check port 8092 is not in use: `sudo netstat -tulpn | grep 8092`

### Database errors
- Check file permissions on `server/data/` directory
- Verify SQLite3 is installed: `sqlite3 --version`

### CORS errors
- Verify CLIENT_URL in .env matches the actual URL being used
- Check browser console for specific CORS error messages
