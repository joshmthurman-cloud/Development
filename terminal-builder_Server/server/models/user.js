import { getDatabase, promisifyDb } from '../config/database.js';
import bcrypt from 'bcrypt';

const db = getDatabase();
const dbAsync = promisifyDb(db);

export class User {
  static async findByUsername(username) {
    return await dbAsync.get('SELECT * FROM users WHERE username = ?', [username]);
  }

  static async findById(id) {
    return await dbAsync.get('SELECT id, username, role, created_at FROM users WHERE id = ?', [id]);
  }

  static async create(username, password, role = 'user') {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await dbAsync.run(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [username, passwordHash, role]
    );
    return { id: result.lastID, username, role };
  }

  static async verifyPassword(username, password) {
    const user = await this.findByUsername(username);
    if (!user) {
      return null;
    }
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return null;
    }
    // Return user without password hash
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      created_at: user.created_at
    };
  }

  static async getAll() {
    return await dbAsync.all('SELECT id, username, role, created_at FROM users ORDER BY username');
  }

  static async updatePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await dbAsync.run(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, userId]
    );
    return true;
  }

  static async delete(userId) {
    await dbAsync.run('DELETE FROM users WHERE id = ?', [userId]);
    return true;
  }

  static async updateRole(userId, role) {
    await dbAsync.run(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, userId]
    );
    return true;
  }

  // STEAM Credentials Management
  static async getSteamCredentials(userId) {
    return await dbAsync.get(
      'SELECT username, password FROM user_steam_credentials WHERE user_id = ?',
      [userId]
    );
  }

  static async setSteamCredentials(userId, username, password) {
    const existing = await dbAsync.get(
      'SELECT id FROM user_steam_credentials WHERE user_id = ?',
      [userId]
    );
    
    if (existing) {
      await dbAsync.run(
        'UPDATE user_steam_credentials SET username = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        [username, password, userId]
      );
    } else {
      await dbAsync.run(
        'INSERT INTO user_steam_credentials (user_id, username, password) VALUES (?, ?, ?)',
        [userId, username, password]
      );
    }
    return true;
  }

  static async deleteSteamCredentials(userId) {
    await dbAsync.run('DELETE FROM user_steam_credentials WHERE user_id = ?', [userId]);
    return true;
  }
}


