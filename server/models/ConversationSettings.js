const mongoose = require('mongoose');

const conversationSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  otherUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deleteAfterSeen: {
    type: Number, // seconds
    default: 86400, // 24 hours
    min: 60, // minimum 1 minute
    max: 2592000 // maximum 30 days
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Compound index to ensure one settings record per conversation per user
conversationSettingsSchema.index({ userId: 1, otherUserId: 1 }, { unique: true });

// Update the updatedAt field on save
conversationSettingsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('ConversationSettings', conversationSettingsSchema);
