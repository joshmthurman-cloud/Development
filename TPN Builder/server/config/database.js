import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '../data');
const dbPath = path.join(dbDir, 'terminal-builder.db');

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('Created data directory:', dbDir);
}

let db = null;

export function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

export function promisifyDb(db) {
  return {
    run: function(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            // 'this' refers to the statement object with lastID and changes
            resolve({ lastID: this.lastID, changes: this.changes });
          }
        });
      });
    },
    get: promisify(db.get.bind(db)),
    all: promisify(db.all.bind(db)),
    close: promisify(db.close.bind(db))
  };
}

export async function initDatabase() {
  const db = getDatabase();
  const dbAsync = promisifyDb(db);

  // Create users table
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create processing_history table
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS processing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT,
      var_data TEXT,
      template_id INTEGER,
      template_name TEXT,
      tpn TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create config table
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create user_steam_credentials table
  await dbAsync.run(`
    CREATE TABLE IF NOT EXISTS user_steam_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id)
    )
  `);

  // Initialize default config values first (needed for Admin STEAM credentials)
  const defaultConfigs = [
    { key: 'steam_api_url', value: 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx', description: 'STEAM API endpoint URL' },
    { key: 'steam_wsdl_url', value: 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx?WSDL', description: 'STEAM WSDL URL' },
    { key: 'steam_username', value: 'apihandler', description: 'STEAM API username' },
    { key: 'steam_password', value: 'gitBMk!qhKqR&KC5', description: 'STEAM API password' },
    { key: 'contactless_signature_default', value: 'Off', description: 'Default Contactless_Signature value' },
    { key: 'keymanagement_rkl_default', value: '', description: 'Default KeyManagement_RKL_Device_GroupName' },
    { key: 'merchant_timezone_default', value: '', description: 'Default Merchant_Time_Zone' }
  ];

  for (const config of defaultConfigs) {
    const existing = await dbAsync.get('SELECT * FROM config WHERE key = ?', [config.key]);
    if (!existing) {
      await dbAsync.run(
        'INSERT INTO config (key, value, description) VALUES (?, ?, ?)',
        [config.key, config.value, config.description]
      );
    }
  }

  // Create or update default admin user
  const adminUser = await dbAsync.get('SELECT * FROM users WHERE username = ?', ['Admin']);
  const newAdminPassword = 'p0okmju7yg';
  let adminUserId;
  
  if (!adminUser) {
    const passwordHash = await bcrypt.hash(newAdminPassword, 10);
    const result = await dbAsync.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      ['Admin', passwordHash, 'admin']
    );
    adminUserId = result.lastID;
    console.log(`Default admin user created (username: Admin, password: ${newAdminPassword})`);
  } else {
    // Update existing admin password
    const passwordHash = await bcrypt.hash(newAdminPassword, 10);
    await dbAsync.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?',
      [passwordHash, 'Admin']
    );
    adminUserId = adminUser.id;
    console.log(`Admin password updated (username: Admin, password: ${newAdminPassword})`);
  }

  // Populate Admin user with global STEAM credentials if they exist
  if (adminUserId) {
    try {
      // Get global STEAM credentials from config table or environment
      const steamUsernameConfig = await dbAsync.get('SELECT value FROM config WHERE key = ?', ['steam_username']);
      const steamPasswordConfig = await dbAsync.get('SELECT value FROM config WHERE key = ?', ['steam_password']);
      
      // Check environment variables as fallback
      const steamUsername = steamUsernameConfig?.value || process.env.STEAM_USERNAME || '';
      const steamPassword = steamPasswordConfig?.value || process.env.STEAM_PASSWORD || '';
      
      // Only set if credentials exist
      if (steamUsername && steamPassword) {
        const existingCreds = await dbAsync.get(
          'SELECT id FROM user_steam_credentials WHERE user_id = ?',
          [adminUserId]
        );
        
        if (!existingCreds) {
          await dbAsync.run(
            'INSERT INTO user_steam_credentials (user_id, username, password) VALUES (?, ?, ?)',
            [adminUserId, steamUsername, steamPassword]
          );
          console.log(`Admin user STEAM credentials populated from global config`);
        } else {
          // Update existing credentials if global config has values
          if (steamUsernameConfig?.value || process.env.STEAM_USERNAME) {
            await dbAsync.run(
              'UPDATE user_steam_credentials SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
              [steamUsername, steamPassword, adminUserId]
            );
            console.log(`Admin user STEAM credentials updated from global config`);
          }
        }
      }
    } catch (error) {
      console.warn('Could not populate Admin STEAM credentials:', error.message);
    }
  }

  console.log('Database schema initialized');
}


