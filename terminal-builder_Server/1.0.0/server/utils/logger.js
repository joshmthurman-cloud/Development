import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
fs.mkdir(LOGS_DIR, { recursive: true }).catch(() => {});

export class Logger {
  static getLogFileName() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(LOGS_DIR, `app-${date}.log`);
  }

  static async writeLog(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    try {
      await fs.appendFile(this.getLogFileName(), logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }

    // Also log to console
    const consoleMessage = `[${timestamp}] [${level}] ${message}`;
    if (level === 'ERROR') {
      console.error(consoleMessage, data || '');
    } else if (level === 'WARN') {
      console.warn(consoleMessage, data || '');
    } else {
      console.log(consoleMessage, data || '');
    }
  }

  static info(message, data = null) {
    this.writeLog('INFO', message, data);
  }

  static warn(message, data = null) {
    this.writeLog('WARN', message, data);
  }

  static error(message, error = null) {
    const errorData = error ? {
      message: error.message,
      stack: error.stack,
      ...(error.response && { response: error.response.data })
    } : null;
    this.writeLog('ERROR', message, errorData);
  }

  static debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      this.writeLog('DEBUG', message, data);
    }
  }
}


