const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// ========================
// ADMIN LOGIN (Static Credentials)
// ========================
router.post('/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    // Check against static credentials from env
    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ message: 'Invalid admin credentials.' });
    }

    // Generate admin JWT
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

// ========================
// USER LOGIN
// ========================
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

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

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
        isAdmin: false
      }
    });
  } catch (error) {
    console.error('User login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ========================
// ADMIN: Create User
// ========================
router.post('/users', adminMiddleware, async (req, res) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password || !displayName) {
      return res.status(400).json({ message: 'Username, password, and display name are required.' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: 'Username already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate avatar from display name
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

// ========================
// ADMIN: Get All Users
// ========================
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

// ========================
// ADMIN: Delete User
// ========================
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

// ========================
// ADMIN: Reset User Password
// ========================
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

module.exports = router;
