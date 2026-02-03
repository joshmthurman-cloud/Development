import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getSteamConfig, updateSteamConfig } from '../config/steamConfig.js';

const router = express.Router();

// Get STEAM configuration
router.get('/config', requireAuth, async (req, res) => {
  try {
    const config = await getSteamConfig();
    // Don't send password in response
    res.json({
      apiUrl: config.apiUrl,
      username: config.username,
      hasPassword: !!config.password
    });
  } catch (error) {
    console.error('Get STEAM config error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch STEAM configuration' });
  }
});

// Update STEAM configuration
router.put('/config', requireAuth, async (req, res) => {
  try {
    const { apiUrl, username, password } = req.body;
    const updates = {};
    
    if (apiUrl) updates.apiUrl = apiUrl;
    if (username) updates.username = username;
    if (password) updates.password = password;

    await updateSteamConfig(updates);
    res.json({ message: 'STEAM configuration updated' });
  } catch (error) {
    console.error('Update STEAM config error:', error);
    res.status(500).json({ error: error.message || 'Failed to update STEAM configuration' });
  }
});

export default router;


