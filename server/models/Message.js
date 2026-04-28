const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// TTL index — messages auto-delete after the configured seconds
// Default: 86400 seconds = 1 day
// This will be managed dynamically by the server
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: parseInt(process.env.MESSAGE_TTL) || 86400 });

module.exports = mongoose.model('Message', messageSchema);
