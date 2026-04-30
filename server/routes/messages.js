const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const ConversationSettings = require('../models/ConversationSettings');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

const cleanupMessages = async () => {
  try {
    const now = new Date();
    const settings = await ConversationSettings.find({});

    for (const setting of settings) {
      const cutoffTime = new Date(now.getTime() - (setting.deleteAfterSeen * 1000));

      await Message.deleteMany({
        $or: [
          { sender: setting.userId, receiver: setting.otherUserId },
          { sender: setting.otherUserId, receiver: setting.userId }
        ],
        seen: true,
        seenAt: { $lt: cutoffTime }
      });
    }
  } catch (error) {
    console.error('Message cleanup error:', error);
  }
};

setInterval(cleanupMessages, 60 * 60 * 1000);
cleanupMessages();

router.get('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const otherUser = await User.findById(otherId);
    if (!otherUser || otherUser.isDeleted) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await Message.updateMany(
      { sender: otherId, receiver: myId, seen: false },
      { seen: true, seenAt: new Date() }
    );

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

    const decryptedMessages = messages.reverse().map((msg) => ({
      ...msg,
      content: Message.decryptContent(msg.content, msg.iv)
    }));

    res.json({
      messages: decryptedMessages,
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
          lastIv: { $first: '$iv' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiver', myId] }, { $eq: ['$seen', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    const userIds = conversations.map(c => c._id);
    const users = await User.find({ _id: { $in: userIds }, isDeleted: { $ne: true } })
      .select('username displayName avatar isOnline lastSeen')
      .lean();

    const userMap = {};
    users.forEach(u => { userMap[u._id.toString()] = u; });

    const result = conversations.map(c => ({
      user: userMap[c._id.toString()] || null,
      lastMessage: c.lastMessage ? Message.decryptContent(c.lastMessage, c.lastIv) : c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      unreadCount: c.unreadCount || 0
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

router.get('/settings/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.userId;

    let settings = await ConversationSettings.findOne({
      userId: myId,
      otherUserId: otherId
    });

    if (!settings) {
      settings = new ConversationSettings({
        userId: myId,
        otherUserId: otherId
      });
      await settings.save();
    }

    res.json(settings);
  } catch (error) {
    console.error('Get conversation settings error:', error);
    res.status(500).json({ message: 'Server error fetching settings.' });
  }
});

router.put('/settings/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.userId;
    const { deleteAfterSeen } = req.body;

    if (deleteAfterSeen < 60 || deleteAfterSeen > 2592000) {
      return res.status(400).json({ message: 'Delete timer must be between 1 minute and 30 days.' });
    }

    const settings = await ConversationSettings.findOneAndUpdate(
      { userId: myId, otherUserId: otherId },
      { deleteAfterSeen },
      { new: true, upsert: true }
    );

    res.json(settings);
  } catch (error) {
    console.error('Update conversation settings error:', error);
    res.status(500).json({ message: 'Server error updating settings.' });
  }
});

router.delete('/conversation/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const otherId = req.params.userId;

    await Message.deleteMany({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId }
      ]
    });

    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ message: 'Server error deleting conversation.' });
  }
});

module.exports = router;

