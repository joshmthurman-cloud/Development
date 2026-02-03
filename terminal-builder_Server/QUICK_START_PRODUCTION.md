# Quick Start - Production Deployment

## Server Details
- **IP**: 10.200.0.235
- **Port**: 8092
- **OS**: Ubuntu 24.04.3 LTS

## Quick Deployment Steps

### 1. On Your Development Machine

Create a deployment package (excludes node_modules and logs):
```bash
tar --exclude='node_modules' \
    --exclude='server/node_modules' \
    --exclude='client/node_modules' \
    --exclude='server/logs' \
    --exclude='.git' \
    -czf terminal-builder.tar.gz .
```

Transfer to server:
```bash
scp terminal-builder.tar.gz user@10.200.0.235:/tmp/
```

### 2. On the Production Server (10.200.0.235)

```bash
# Extract files
sudo mkdir -p /opt/terminal-builder
sudo chown $USER:$USER /opt/terminal-builder
cd /opt/terminal-builder
tar -xzf /tmp/terminal-builder.tar.gz

# Run deployment script
chmod +x deploy.sh
./deploy.sh

# Update systemd service with your username
sed -i "s/YOUR_USERNAME/$USER/g" terminal-builder.service

# Install and start service
sudo cp terminal-builder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable terminal-builder
sudo systemctl start terminal-builder

# Check status
sudo systemctl status terminal-builder

# Open firewall (if needed)
sudo ufw allow 8092/tcp
```

### 3. Access Application

Open browser: `http://10.200.0.235:8092`

Default login:
- Username: `Admin`
- Password: `Admin`

**⚠️ Change the default password immediately!**

## Useful Commands

```bash
# View logs
sudo journalctl -u terminal-builder -f

# Restart service
sudo systemctl restart terminal-builder

# Stop service
sudo systemctl stop terminal-builder

# Check if running
curl http://localhost:8092/api/health
```

## Troubleshooting

If the service fails to start:
1. Check logs: `sudo journalctl -u terminal-builder -n 50`
2. Verify .env exists: `ls -la /opt/terminal-builder/server/.env`
3. Check port: `sudo netstat -tulpn | grep 8092`
4. Verify Node.js: `node --version` (should be v18+)
