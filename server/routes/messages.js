const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    });

    res.json({
      messages: messages.reverse(),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ message: 'Server error fetching conversation.' });
  }
});

router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.userId);

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: myId }, { receiver: myId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', myId] }, '$receiver', '$sender']
          },
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          unread: { $sum: 0 }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    const userIds = conversations.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds } })
      .select('username displayName avatar isOnline lastSeen')
      .lean();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = conversations.map(c => ({
      user: userMap[c._id.toString()] || null,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt
    })).filter(c => c.user);

    res.json(result);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error fetching conversations.' });
  }
});

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const total = await Message.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Message.countDocuments({ createdAt: { $gte: today } });

    res.json({ total, todayCount });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error fetching stats.' });
  }
});

module.exports = router;
