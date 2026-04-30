require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const User = require('./models/User');

const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const connectedUsers = new Map();
const userSockets = new Map();

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.userId).select('isBanned');
    if (!currentUser || currentUser.isBanned) {
      return next(new Error('User is banned or invalid'));
    }
    socket.user = decoded;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const user = socket.user;

  connectedUsers.set(socket.id, {
    userId: user.userId,
    username: user.username,
    socketId: socket.id
  });

  userSockets.set(user.userId, socket.id);

  if (user.userId) {
    await User.findByIdAndUpdate(user.userId, { isOnline: true, lastSeen: new Date() });
  }

  io.emit('users:online', Array.from(connectedUsers.values()));

  socket.on('message:send', async (data) => {
    try {
      if (!data.receiverId) {
        return socket.emit('message:error', { message: 'Receiver is required.' });
      }

      const receiver = await User.findById(data.receiverId).select('blockedUsers');
      if (receiver && receiver.blockedUsers?.includes(user.userId)) {
        return socket.emit('message:error', { message: 'You have been blocked by this user.' });
      }

      const message = new Message({
        sender: user.userId,
        receiver: data.receiverId,
        senderName: data.senderName || user.username,
        content: data.content
      });

      await message.save();

      const messageData = {
        _id: message._id,
        sender: message.sender,
        receiver: message.receiver,
        senderName: message.senderName,
        content: message.getDecryptedContent(),
        createdAt: message.createdAt
      };

      socket.emit('message:new', messageData);

      const receiverSocketId = userSockets.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:new', messageData);
      }
    } catch (error) {
      console.error('Message send error:', error);
      socket.emit('message:error', { message: 'Failed to send message.' });
    }
  });

  socket.on('typing:start', (data) => {
    const receiverSocketId = userSockets.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:start', {
        username: data.username || user.username,
        userId: user.userId
      });
    }
  });

  socket.on('typing:stop', (data) => {
    const receiverSocketId = userSockets.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:stop', {
        username: data.username || user.username,
        userId: user.userId
      });
    }
  });

  socket.on('disconnect', async () => {
    connectedUsers.delete(socket.id);
    userSockets.delete(user.userId);

    if (user.userId) {
      await User.findByIdAndUpdate(user.userId, { isOnline: false, lastSeen: new Date() });
    }

    io.emit('users:online', Array.from(connectedUsers.values()));
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
