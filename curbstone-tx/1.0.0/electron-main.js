const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');

let mainWindow;

// Check if dev server is available
function checkDevServer() {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:5173', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Check if dev server is running, otherwise use production build
  const isDevServerAvailable = await checkDevServer();
  
  if (isDevServerAvailable) {
    console.log('Loading from dev server: http://127.0.0.1:5173');
    mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('Loading from production build: dist/index.html');
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle log file writes - writes to LOGS folder automatically
// For network deployment, set LOGS_PATH environment variable or use default app directory
ipcMain.handle('write-log-entry', async (event, logEntry) => {
  try {
    // Determine logs directory:
    // 1. Check environment variable LOGS_PATH (for network shares: \\server\logs\curbstone-tx)
    // 2. Use app directory/LOGS as fallback (C:\curbstone-tx\LOGS)
    const logsDir = process.env.LOGS_PATH || path.join(__dirname, 'LOGS');
    
    // Ensure LOGS directory exists (creates if it doesn't)
    try {
      await fs.mkdir(logsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist, that's fine
      if (e.code !== 'EEXIST') {
        console.error('Error creating LOGS directory:', e);
      }
    }

    // Get date for filename (YYYYMMDD.jsonl)
    const date = new Date(logEntry.timestamp);
    const year = String(date.getFullYear());
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const fileName = `${year}${month}${day}.jsonl`;
    const filePath = path.join(logsDir, fileName);

    // Prepare JSON object
    const logObject = {
      timestamp: logEntry.timestamp,
      user: logEntry.user,
      transType: logEntry.transType,
      amount: logEntry.amount,
      refId: String(logEntry.refId),
      requestUrl: logEntry.requestUrl,
      requestXml: logEntry.requestXml,
      responseCaptured: logEntry.responseCaptured || '',
      status: logEntry.status || '',
    };

    // Append to file (appendFile is atomic on Windows, safe for concurrent writes)
    const jsonLine = JSON.stringify(logObject) + '\n';
    await fs.appendFile(filePath, jsonLine, 'utf8');
    
    return { success: true };
  } catch (error) {
    console.error('Error writing log file:', error);
    return { success: false, error: error.message };
  }
});

