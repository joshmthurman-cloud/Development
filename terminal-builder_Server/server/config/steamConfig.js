import dotenv from 'dotenv';
import { getDatabase, promisifyDb } from './database.js';

dotenv.config();

let configCache = null;

/**
 * Get STEAM configuration from database or environment
 * @param {number} userId - Optional user ID to get user-specific credentials
 * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
 */
export async function getSteamConfig(userId = null, varType = null) {
  const db = getDatabase();
  const dbAsync = promisifyDb(db);

  // If varType is 'UR', use UR-specific credentials
  // UR always uses production URL (never test)
  if (varType === 'UR') {
    const config = {
      apiUrl: 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx', // Always production for UR
      username: 'apihandlerUR',
      password: 'Password1!',
      wsdlUrl: 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx?WSDL', // Always production for UR
      companyId: 3557  // UR company ID
    };
    
    // Check database for URL, but only use if it's production (not test)
    try {
      const dbConfig = await dbAsync.all('SELECT key, value FROM config WHERE key IN (?, ?)', ['steam_api_url', 'steam_wsdl_url']);
      dbConfig.forEach(row => {
        if (row.key === 'steam_api_url' && row.value) {
          // Only use database URL if it's production (not test)
          if (row.value.includes('dvmms.com') && !row.value.includes('test.dvmms.com') && row.value.startsWith('https://')) {
            config.apiUrl = row.value;
          }
        }
        if (row.key === 'steam_wsdl_url' && row.value) {
          // Only use database URL if it's production (not test)
          if (row.value.includes('dvmms.com') && !row.value.includes('test.dvmms.com') && row.value.startsWith('https://')) {
            config.wsdlUrl = row.value;
          }
        }
      });
    } catch (error) {
      console.warn('Could not load STEAM URL from database for UR:', error.message);
    }
    
    return config;
  }

  const config = {
    apiUrl: process.env.STEAM_API_URL || 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx',
    username: process.env.STEAM_USERNAME || '',
    password: process.env.STEAM_PASSWORD || '',
    wsdlUrl: process.env.STEAM_WSDL_URL || 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx?WSDL',
    companyId: 1552  // Default company ID
  };

  // If userId is provided, try to get user-specific credentials first
  if (userId) {
    try {
      const userCreds = await dbAsync.get(
        'SELECT username, password FROM user_steam_credentials WHERE user_id = ?',
        [userId]
      );
      if (userCreds && userCreds.username && userCreds.password) {
        config.username = userCreds.username;
        config.password = userCreds.password;
        // Still get API URL and WSDL URL from global config
        const dbConfig = await dbAsync.all('SELECT key, value FROM config WHERE key IN (?, ?)', ['steam_api_url', 'steam_wsdl_url']);
        dbConfig.forEach(row => {
          if (row.key === 'steam_api_url' && row.value) config.apiUrl = row.value;
          if (row.key === 'steam_wsdl_url' && row.value) config.wsdlUrl = row.value;
        });
        return config;
      }
    } catch (error) {
      console.warn('Could not load user-specific STEAM config:', error.message);
    }
  }

  // Try to get from database config table (global config)
  try {
    const dbConfig = await dbAsync.all('SELECT key, value FROM config WHERE key LIKE "steam_%"');
    dbConfig.forEach(row => {
      const key = row.key.replace('steam_', '').replace('_', '');
      if (key === 'apiurl' && row.value) config.apiUrl = row.value;
      if (key === 'wsdlurl' && row.value) config.wsdlUrl = row.value;
      if (key === 'username' && row.value) config.username = row.value;
      if (key === 'password' && row.value) config.password = row.value;
    });
  } catch (error) {
    console.warn('Could not load STEAM config from database:', error.message);
  }

  // Only cache if no userId was provided (global config)
  if (!userId) {
    configCache = config;
  }
  return config;
}

/**
 * Update STEAM configuration
 */
export async function updateSteamConfig(updates) {
  const db = getDatabase();
  const dbAsync = promisifyDb(db);

  if (updates.apiUrl) {
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [updates.apiUrl, 'steam_api_url']
    );
  }
  if (updates.username) {
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [updates.username, 'steam_username']
    );
  }
  if (updates.password) {
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [updates.password, 'steam_password']
    );
  }
  if (updates.wsdlUrl) {
    await dbAsync.run(
      'UPDATE config SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?',
      [updates.wsdlUrl, 'steam_wsdl_url']
    );
  }

  // Clear cache
  configCache = null;
  // Note: SOAP client will auto-detect WSDL URL changes on next getClient() call
}

/**
 * Clear configuration cache
 */
export function clearConfigCache() {
  configCache = null;
}

/**
 * Get STEAM credentials for a specific user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Credentials object with username and password
 */
export async function getUserSteamCredentials(userId) {
  const db = getDatabase();
  const dbAsync = promisifyDb(db);
  
  try {
    const creds = await dbAsync.get(
      'SELECT username, password FROM user_steam_credentials WHERE user_id = ?',
      [userId]
    );
    return creds || null;
  } catch (error) {
    console.error('Error getting user STEAM credentials:', error);
    return null;
  }
}


