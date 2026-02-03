#!/bin/bash
# Terminal Builder Production Deployment Script
# Run this script on the Ubuntu server after transferring files

set -e

echo "=== Terminal Builder Deployment Script ==="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please do not run as root. Run as the application user."
   exit 1
fi

APP_DIR="/opt/terminal-builder"
CURRENT_USER=$(whoami)

echo "Installing dependencies..."
cd $APP_DIR

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install server dependencies (production only)
echo "Installing server dependencies..."
cd server
npm install --production

# Install client dependencies
echo "Installing client dependencies..."
cd ../client
npm install

# Build client
echo "Building client application..."
cd ..
npm run build

# Create .env file if it doesn't exist
if [ ! -f "$APP_DIR/server/.env" ]; then
    echo ""
    echo "Creating .env file from template..."
    cat > $APP_DIR/server/.env << EOF
# Production Environment Variables
PORT=8092
HOST=0.0.0.0
NODE_ENV=production
CLIENT_URL=http://10.200.0.235:8092
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
STEAM_API_URL=https://dvmms.com/steam/api/ws/VDirectAccess.asmx
STEAM_WSDL_URL=https://dvmms.com/steam/api/ws/VDirectAccess.asmx?WSDL
STEAM_USERNAME=apihandler
STEAM_PASSWORD=gitBMk!qhKqR&KC5
EOF
    echo ".env file created. Please review and update if needed: $APP_DIR/server/.env"
else
    echo ".env file already exists, skipping creation."
fi

# Set permissions
echo "Setting file permissions..."
chmod 600 $APP_DIR/server/.env
chmod -R 755 $APP_DIR

# Create data and logs directories if they don't exist
mkdir -p $APP_DIR/server/data
mkdir -p $APP_DIR/server/logs
mkdir -p $APP_DIR/server/uploads

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Review and update $APP_DIR/server/.env if needed"
echo "2. Update terminal-builder.service with your username: $CURRENT_USER"
echo "3. Copy service file: sudo cp $APP_DIR/terminal-builder.service /etc/systemd/system/"
echo "4. Enable and start service:"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable terminal-builder"
echo "   sudo systemctl start terminal-builder"
echo ""
echo "Access the application at: http://10.200.0.235:8092"
