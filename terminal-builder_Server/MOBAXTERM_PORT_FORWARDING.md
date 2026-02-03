# MobaXterm Port Forwarding Setup

## Accessing Production Server (10.200.0.235:8092) via MobaXterm

MobaXterm allows you to create SSH tunnels to access services running on remote servers. Here's how to set it up:

## Method 1: SSH Tunnel (Port Forwarding)

### Step 1: Create SSH Session
1. Open MobaXterm
2. Click **Session** → **New Session**
3. Select **SSH**
4. Enter connection details:
   - **Remote host**: `10.200.0.235`
   - **Username**: Your server username
   - **Port**: `22` (default SSH port)
   - Check **"Specify username"** if needed
5. Click **OK**

### Step 2: Set Up Port Forwarding
1. In the SSH session settings (before connecting), click **Advanced SSH settings**
2. Go to **Network settings** tab
3. Under **Port forwarding**, click **Add**
4. Configure the tunnel:
   - **Forwarded port**: `8092` (or any local port you prefer, e.g., `8092`)
   - **Remote server**: `localhost` (or `127.0.0.1`)
   - **Remote port**: `8092`
   - **Direction**: `Local port forwarding` (L)
5. Click **OK** to save
6. Connect to the session

### Step 3: Access the Application
Once connected, you can access the application at:
- **Local URL**: `http://localhost:8092`
- The connection will be forwarded to `10.200.0.235:8092` on the server

## Method 2: Dynamic Port Forwarding (SOCKS Proxy)

If you need to access multiple services or want a more flexible setup:

1. Create SSH session as above
2. In **Advanced SSH settings** → **Network settings**
3. Enable **SOCKS proxy** on port `1080`
4. Configure your browser to use SOCKS proxy:
   - Host: `127.0.0.1`
   - Port: `1080`
   - Type: `SOCKS5`

## Method 3: Quick Tunnel (After Connection)

If you're already connected:

1. Right-click on the SSH session tab
2. Select **Tunneling** → **New tunnel**
3. Configure:
   - **Type**: Local port forwarding
   - **Source port**: `8092`
   - **Destination**: `localhost:8092`
4. Click **OK**

## Troubleshooting

### Port Already in Use
If port 8092 is already in use locally, use a different local port:
- **Forwarded port**: `18092` (or any available port)
- Access at: `http://localhost:18092`

### Connection Refused
- Verify the service is running on the server: `sudo systemctl status terminal-builder`
- Check if port 8092 is listening: `sudo netstat -tulpn | grep 8092`
- Verify firewall allows the connection

### Can't Access After Tunnel Setup
- Make sure the SSH session is connected and active
- Check that the tunnel is active in MobaXterm's tunnel manager
- Try accessing `http://127.0.0.1:8092` instead of `localhost:8092`

## Alternative: Direct Access (If Network Allows)

If your network allows direct access to `10.200.0.235:8092`:
- Simply open: `http://10.200.0.235:8092` in your browser
- No port forwarding needed

## Security Note

SSH tunnels encrypt your traffic, which is recommended for accessing production services over untrusted networks.
