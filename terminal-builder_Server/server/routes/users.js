import express from 'express';
import { User } from '../models/user.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users (admin only)
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await User.getAll();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new user (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if user already exists
    const existing = await User.findByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = await User.create(username, password, role || 'user');
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user password (admin only, or user updating their own password)
router.put('/:id/password', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = parseInt(id);

    // Users can only update their own password unless they're admin
    if (req.session.role !== 'admin' && req.session.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    await User.updatePassword(userId, password);
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin only)
router.put('/:id/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const userId = parseInt(id);

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin or user)' });
    }

    // Prevent changing admin's own role (safety measure)
    if (req.session.userId === userId && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot remove admin role from yourself' });
    }

    await User.updateRole(userId, role);
    res.json({ message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Prevent deleting yourself
    if (req.session.userId === userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await User.delete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user STEAM credentials (admin can view any, users can view their own)
router.get('/:id/steam-credentials', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Users can only view their own credentials unless they're admin
    if (req.session.role !== 'admin' && req.session.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const credentials = await User.getSteamCredentials(userId);
    if (!credentials) {
      return res.json({ credentials: null, message: 'No STEAM credentials configured' });
    }

    // Don't send password in response for security
    res.json({
      credentials: {
        username: credentials.username,
        hasPassword: !!credentials.password
      }
    });
  } catch (error) {
    console.error('Get STEAM credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set user STEAM credentials (admin can set any, users can set their own)
router.put('/:id/steam-credentials', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    const userId = parseInt(id);

    // Users can only set their own credentials unless they're admin
    if (req.session.role !== 'admin' && req.session.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'STEAM username and password are required' });
    }

    await User.setSteamCredentials(userId, username, password);
    res.json({ message: 'STEAM credentials updated successfully' });
  } catch (error) {
    console.error('Set STEAM credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user STEAM credentials (admin can delete any, users can delete their own)
router.delete('/:id/steam-credentials', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    // Users can only delete their own credentials unless they're admin
    if (req.session.role !== 'admin' && req.session.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    await User.deleteSteamCredentials(userId);
    res.json({ message: 'STEAM credentials deleted successfully' });
  } catch (error) {
    console.error('Delete STEAM credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
