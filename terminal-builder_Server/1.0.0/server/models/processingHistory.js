import { getDatabase, promisifyDb } from '../config/database.js';

const db = getDatabase();
const dbAsync = promisifyDb(db);

export class ProcessingHistory {
  static async create(userId, fileName, filePath, varData, status = 'pending') {
    const result = await dbAsync.run(
      `INSERT INTO processing_history 
       (user_id, file_name, file_path, var_data, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, fileName, filePath, JSON.stringify(varData), status]
    );
    return result.lastID;
  }

  static async findById(id, userId) {
    return await dbAsync.get(
      'SELECT * FROM processing_history WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async findByUserId(userId, limit = 100) {
    return await dbAsync.all(
      `SELECT id, file_name, template_id, template_name, tpn, status, error_message, 
              created_at, completed_at 
       FROM processing_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
  }

  static async update(id, updates) {
    const fields = [];
    const values = [];

    if (updates.template_id !== undefined) {
      fields.push('template_id = ?');
      values.push(updates.template_id);
    }
    if (updates.template_name !== undefined) {
      fields.push('template_name = ?');
      values.push(updates.template_name);
    }
    if (updates.tpn !== undefined) {
      fields.push('tpn = ?');
      values.push(updates.tpn);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.error_message !== undefined) {
      fields.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.completed_at !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at);
    }

    if (fields.length === 0) {
      return;
    }

    values.push(id);
    await dbAsync.run(
      `UPDATE processing_history 
       SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      values
    );
  }
}


