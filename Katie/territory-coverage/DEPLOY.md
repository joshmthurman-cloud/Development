# Deploying Territory Coverage on Ubuntu

This guide deploys the app so it is available at **http://10.200.0.235:8094** and keeps running after you close your terminal (using systemd).

## Prerequisites on the Ubuntu server

- Node.js 18+ and npm  
  Example (Node 20): `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs`

## One-time setup

### 1. Put the app on the server

Copy the project to the server (e.g. with git, rsync, or SCP). Example with a directory under your home folder:

```bash
# On the server, e.g.:
cd ~
# If using git:
git clone <your-repo-url> territory-coverage
cd territory-coverage
# Or copy the folder from your machine and then:
# cd ~/territory-coverage
```

### 2. Install dependencies and build

```bash
cd ~/territory-coverage   # or your actual path
npm install
```

### 3. Environment variables

Create a `.env` in the project root:

```bash
# Generate a secret: openssl rand -base64 32
AUTH_SECRET=your-generated-secret-here
```

### 4. Database

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Production build

```bash
npm run build
```

---

## Running so it survives closing your terminal

Use **systemd** so the app starts on boot and restarts if it crashes. It does **not** depend on your SSH session.

### 1. Create a systemd service file

Replace `YOUR_USER` and `YOUR_APP_PATH` with your Ubuntu username and the full path to the project (e.g. `/home/youruser/territory-coverage`).

```bash
sudo nano /etc/systemd/system/territory-coverage.service
```

Paste (adjust `User`, `WorkingDirectory`, `ExecStart` path):

```ini
[Unit]
Description=Territory Coverage Next.js App
After=network.target

[Service]
Type=simple
User=YOUR_USER
WorkingDirectory=YOUR_APP_PATH
Environment=NODE_ENV=production
Environment=PORT=8094
ExecStart=/usr/bin/env npm run start:server
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+O, Enter, Ctrl+X).

### 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable territory-coverage
sudo systemctl start territory-coverage
sudo systemctl status territory-coverage
```

### 3. Useful commands

| Command | Purpose |
|--------|--------|
| `sudo systemctl status territory-coverage` | Check if it’s running |
| `sudo systemctl stop territory-coverage` | Stop the app |
| `sudo systemctl start territory-coverage` | Start the app |
| `sudo systemctl restart territory-coverage` | Restart after code/config changes |
| `journalctl -u territory-coverage -f` | Follow logs (Ctrl+C to exit) |

### 4. Open in browser

- **URL:** http://10.200.0.235:8094  
- Ensure port **8094** is allowed through the server firewall if you use one, e.g. `sudo ufw allow 8094 && sudo ufw reload`.

---

## After updating the app

On the server:

```bash
cd ~/territory-coverage   # or your actual path
git pull                  # if using git
npm install
npm run prisma:migrate    # if you added migrations
npm run build
sudo systemctl restart territory-coverage
```

---

## Optional: run once in background (no systemd)

If you don’t want systemd yet, you can run in the background in the current session:

```bash
cd ~/territory-coverage
npm run start:server &
disown
```

Or with `nohup` (survives closing the terminal but not reboot):

```bash
cd ~/territory-coverage
nohup npm run start:server > app.log 2>&1 &
```

The app will be available at **http://10.200.0.235:8094** as long as the process is running. For a permanent setup, use the systemd steps above.
