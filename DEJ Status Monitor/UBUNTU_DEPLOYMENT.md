# Ubuntu Server Deployment Guide

## Server Information
- **IP Address**: 10.200.0.235
- **Port**: 8091
- **OS**: Ubuntu 24.04.3 LTS

## Prerequisites

1. **Install Python 3.11+**
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv -y
```

2. **Verify Python Installation**
```bash
python3 --version
```

## Deployment Steps

### 1. Upload Files to Server

Upload the entire project directory to the server. You can use:
- SCP: `scp -r "DEJ Status Monitor_Local_Server" user@10.200.0.235:/home/user/`
- SFTP
- Git clone (if using version control)

### 2. Navigate to Project Directory

```bash
cd "/path/to/DEJ Status Monitor_Local_Server"
```

### 3. Create Virtual Environment

```bash
python3 -m venv venv
```

### 4. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 5. Install Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 6. Configure Environment Variables (Optional)

Create a `.env` file in the project root:

```bash
nano .env
```

Add:
```
RELOAD=false
PORT=8091
BASE_URL=http://10.200.0.235:8091
DB_PATH=./status_monitor.db
TPN_FILE_PATH=./tpns.txt
CONFIG_FILE_PATH=./config.json
```

### 7. Test Run (Manual)

```bash
chmod +x run.sh
./run.sh
```

Or directly:
```bash
source venv/bin/activate
export RELOAD=false
export PORT=8091
export BASE_URL=http://10.200.0.235:8091
python3 run.py
```

The application should be accessible at `http://10.200.0.235:8091`

### 8. Set Up as Systemd Service (Recommended)

1. **Create service file**:
```bash
sudo nano /etc/systemd/system/status-monitor.service
```

2. **Copy the contents of `status-monitor.service` file** (update paths and username):
   - Replace `YOUR_USERNAME` with your Ubuntu username
   - Replace `/path/to/DEJ Status Monitor_Local_Server` with actual deployment path

3. **Reload systemd**:
```bash
sudo systemctl daemon-reload
```

4. **Enable service** (start on boot):
```bash
sudo systemctl enable status-monitor.service
```

5. **Start service**:
```bash
sudo systemctl start status-monitor.service
```

6. **Check status**:
```bash
sudo systemctl status status-monitor.service
```

7. **View logs**:
```bash
sudo journalctl -u status-monitor.service -f
```

### 9. Firewall Configuration

If using UFW firewall:
```bash
sudo ufw allow 8091/tcp
sudo ufw reload
```

## Service Management

- **Start**: `sudo systemctl start status-monitor.service`
- **Stop**: `sudo systemctl stop status-monitor.service`
- **Restart**: `sudo systemctl restart status-monitor.service`
- **Status**: `sudo systemctl status status-monitor.service`
- **Logs**: `sudo journalctl -u status-monitor.service -f`
- **Disable auto-start**: `sudo systemctl disable status-monitor.service`

## Troubleshooting

### Port Already in Use
```bash
sudo netstat -tulpn | grep 8091
# Kill the process if needed
sudo kill -9 <PID>
```

### Permission Issues
```bash
# Make sure the user owns the project directory
sudo chown -R $USER:$USER "/path/to/DEJ Status Monitor_Local_Server"
```

### Database Issues
The database will be created automatically. If you need to reset:
```bash
rm status_monitor.db
# Restart the service
sudo systemctl restart status-monitor.service
```

### Check Application Logs
```bash
# Systemd logs
sudo journalctl -u status-monitor.service -n 100

# Or check application output directly
cd "/path/to/DEJ Status Monitor_Local_Server"
source venv/bin/activate
python3 run.py
```

## Accessing the Application

Once running, access the web interface at:
- **Local**: `http://localhost:8091`
- **Network**: `http://10.200.0.235:8091`

## File Structure

Make sure these files exist:
- `tpns.txt` - Terminal list
- `config.json` - Configuration file
- `requirements.txt` - Python dependencies
- `run.py` - Application entry point
- `run.sh` - Linux startup script

## IP Address Configuration

The IP address **10.200.0.235** is configured in the following files:
- `run.sh` - BASE_URL environment variable
- `status-monitor.service` - BASE_URL environment variable
- `app/main.py` - Default BASE_URL for email links (line ~1392)

To change the IP address, update the `BASE_URL` environment variable in:
1. `run.sh` (line 15)
2. `status-monitor.service` (line 12)
3. Or set it as an environment variable when running
