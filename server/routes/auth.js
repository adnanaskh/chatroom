const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Message = require('../models/Message');
const ConversationSettings = require('../models/ConversationSettings');
const ActivityLog = require('../models/ActivityLog');
const { adminMiddleware, authMiddleware } = require('../middleware/auth');

const router = express.Router();

const logActivity = async (req, userId, username, action, details = '') => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'Unknown';
    const browser = req.headers['user-agent'] || 'Unknown';
    const country = req.headers['cf-ipcountry'] || req.headers['x-vercel-ip-country'] || 'Unknown';
    
    await ActivityLog.create({
      userId,
      username,
      action,
      ipAddress,
      browser,
      country,
      details
    });
  } catch (err) {
    console.error('Failed to log activity', err);
  }
};

router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    const token = jwt.sign(
      { isAdmin: true, username: process.env.ADMIN_USERNAME },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        username: process.env.ADMIN_USERNAME,
        isAdmin: true
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: 'This account has been banned.' });
    }

    if (user.isDeleted) {
      return res.status(403).json({ message: 'This account has been deleted.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    await logActivity(req, user._id, user.username, 'LOGIN');

    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isAdmin: false,
        blockedUsers: user.blockedUsers || []
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ message: 'Username, password, and display name are required.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=128&bold=true`;

    const user = new User({
      username,
      password: hashedPassword,
      displayName,
      avatar,
      createdBy: 'self'
    });

    await user.save();

    await logActivity(req, user._id, user.username, 'REGISTER');

    const token = jwt.sign(
      { userId: user._id, username: user.username, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isAdmin: false,
        blockedUsers: []
      }
    });
  } catch (error) {
    console.error('User register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { displayName, password } = req.body;
    const updates = {};
    if (displayName) updates.displayName = displayName.trim();
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters.' });
      }
      const salt = await bcrypt.genSalt(12);
      updates.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (updates.displayName) {
      await logActivity(req, user._id, user.username, 'NAME_CHANGE', `Changed display name to ${updates.displayName}`);
    }
    if (updates.password) {
      await logActivity(req, user._id, user.username, 'PASSWORD_CHANGE');
    }

    res.json({ message: 'Profile updated successfully.', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile.' });
  }
});

router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Delete all messages sent by or received by this user
    await Message.deleteMany({
      $or: [{ sender: userId }, { receiver: userId }]
    });

    // Delete all conversation settings for this user
    await ConversationSettings.deleteMany({
      $or: [{ userId: userId }, { otherUserId: userId }]
    });

    await logActivity(req, userId, req.user.username, 'ACCOUNT_DELETED');

    // Soft delete the user account
    const user = await User.findByIdAndUpdate(
      userId,
      {
        isDeleted: true,
        deletedAt: new Date(),
        isOnline: false,
        displayName: `[Deleted User]`,
        avatar: ''
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Account deleted successfully. All your messages have been removed.' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: 'Server error deleting account.' });
  }
});

router.post('/me/block/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const userIdToBlock = req.params.userId;

    if (myId === userIdToBlock) {
      return res.status(400).json({ message: 'You cannot block yourself.' });
    }

    const user = await User.findById(myId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (!user.blockedUsers.includes(userIdToBlock)) {
      user.blockedUsers.push(userIdToBlock);
      await user.save();
    }

    res.json({ message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Server error blocking user.' });
  }
});

router.delete('/me/block/:userId', authMiddleware, async (req, res) => {
  try {
    const myId = req.user.userId;
    const userIdToUnblock = req.params.userId;

    const user = await User.findById(myId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== userIdToUnblock);
    await user.save();

    res.json({ message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({ message: 'Server error unblocking user.' });
  }
});

router.patch('/users/:id/ban', adminMiddleware, async (req, res) => {
  try {
    const { isBanned, reason } = req.body;
    const updates = {
      isBanned: Boolean(isBanned),
      banReason: isBanned ? (reason || 'No reason provided') : '',
      bannedAt: isBanned ? new Date() : null
    };
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: `User has been ${isBanned ? 'banned' : 'unbanned'}.`, user });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error updating ban status.' });
  }
});

router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ message: 'Username, password, and display name are required.' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff&size=128&bold=true`;

    const user = new User({
      username,
      password: hashedPassword,
      displayName,
      avatar,
      createdBy: 'admin'
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    res.status(500).json({ message: 'Server error creating user.' });
  }
});

router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

router.get('/users/:id/activity', adminMiddleware, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.json(logs);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ message: 'Server error fetching activity logs.' });
  }
});

router.delete('/users/:id', adminMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

router.patch('/users/:id/password', adminMiddleware, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { password: hashedPassword },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'Password reset successfully.', user });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
});

router.get('/search', authMiddleware, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user.userId },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { displayName: { $regex: query, $options: 'i' } }
      ]
    })
      .select('username displayName avatar isOnline lastSeen')
      .limit(20)
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users.' });
  }
});

router.get('/all-users', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.userId }, isDeleted: { $ne: true } })
      .select('username displayName avatar isOnline lastSeen')
      .sort({ displayName: 1 })
      .lean();
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

module.exports = router;
