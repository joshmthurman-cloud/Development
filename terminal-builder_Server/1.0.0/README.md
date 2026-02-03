# Terminal Builder from VAR Sheets

Web application for processing VAR (Value Added Reseller) sheets from merchant processing networks, extracting terminal configuration data, and creating TPNs (Terminal Profile Numbers) in STEAM via SOAP API.

## Features

- PDF VAR sheet upload and processing
- Automatic data extraction from TSYS VAR sheets
- Field mapping from VAR to STEAM format
- Template selection from STEAM
- TPN creation and parameter population
- Batch processing support
- User authentication

## Setup

### Prerequisites
- Node.js (v18 or higher)
- npm

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install server dependencies:
```bash
cd server
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
```

### Configuration

Create a `.env` file in the `server` directory:
```
PORT=3000
STEAM_API_URL=https://dvmms.com/steam/api/ws/VDirectAccess.asmx
STEAM_USERNAME=apihandler
STEAM_PASSWORD=gitBMk!qhKqR&KC5
SESSION_SECRET=your-secret-key-here
NODE_ENV=development
```

### Running

Development mode (runs both server and client):
```bash
npm run dev
```

Server only:
```bash
npm run dev:server
```

Client only:
```bash
npm run dev:client
```

Production:
```bash
npm run build
npm start
```

## Default Login

- Username: `Admin`
- Password: `Admin`

## Project Structure

- `server/` - Node.js/Express backend
- `client/` - React frontend with Vite


