const express = require('express');
const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', adminMiddleware, async (req, res) => {
  try {
    const settings = await Settings.find({});
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    res.json(settingsMap);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error fetching settings.' });
  }
});

router.delete('/messages', adminMiddleware, async (req, res) => {
  try {
    const result = await mongoose.connection.collection('chatmeesage').deleteMany({});
    res.json({ message: `Cleared ${result.deletedCount} messages.` });
  } catch (error) {
    console.error('Clear messages error:', error);
    res.status(500).json({ message: 'Server error clearing messages.' });
  }
});

module.exports = router;
