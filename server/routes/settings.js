const express = require('express');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ========================
// Get Current Settings
// ========================
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const settings = await Settings.find({});
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Defaults
    if (!settingsMap.messageTTL) {
      settingsMap.messageTTL = parseInt(process.env.MESSAGE_TTL) || 86400;
    }

    res.json(settingsMap);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error fetching settings.' });
  }
});

// ========================
// Update Message TTL
// ========================
router.put('/ttl', adminMiddleware, async (req, res) => {
  try {
    const { ttl } = req.body;

    if (!ttl || ttl < 60) {
      return res.status(400).json({ message: 'TTL must be at least 60 seconds.' });
    }

    // Update or create setting
    await Settings.findOneAndUpdate(
      { key: 'messageTTL' },
      { key: 'messageTTL', value: ttl },
      { upsert: true, new: true }
    );

    // Recreate TTL index with new value
    try {
      const collection = mongoose.connection.collection('messages');
      
      // Drop the old TTL index
      const indexes = await collection.indexes();
      const ttlIndex = indexes.find(idx => idx.key && idx.key.createdAt === 1 && idx.expireAfterSeconds !== undefined);
      if (ttlIndex) {
        await collection.dropIndex(ttlIndex.name);
      }
      
      // Create new TTL index
      await collection.createIndex(
        { createdAt: 1 },
        { expireAfterSeconds: parseInt(ttl) }
      );
    } catch (indexError) {
      console.error('TTL index update error:', indexError);
      // Non-fatal: the setting is saved, index will be recreated on restart
    }

    res.json({ 
      message: `Message TTL updated to ${ttl} seconds (${(ttl / 3600).toFixed(1)} hours)`,
      ttl 
    });
  } catch (error) {
    console.error('Update TTL error:', error);
    res.status(500).json({ message: 'Server error updating TTL.' });
  }
});

// ========================
// Clear All Messages (Admin)
// ========================
router.delete('/messages', adminMiddleware, async (req, res) => {
  try {
    const result = await mongoose.connection.collection('messages').deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} messages.` });
  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({ message: 'Server error clearing messages.' });
  }
});

module.exports = router;
