const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['LOGIN', 'REGISTER', 'NAME_CHANGE', 'PASSWORD_CHANGE', 'ACCOUNT_DELETED'],
    required: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  browser: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'Unknown'
  },
  details: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
