const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_SECRET = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default_secret_key_1234';
const ENCRYPTION_KEY = crypto.createHash('md5').update(ENCRYPTION_SECRET).digest();
const IV_LENGTH = 16;

function encryptText(plainText) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-128-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return { iv: iv.toString('base64'), content: encrypted };
}

function decryptText(encryptedText, ivValue) {
  if (!encryptedText || !ivValue) return encryptedText;
  const iv = Buffer.from(ivValue, 'base64');
  const decipher = crypto.createDecipheriv('aes-128-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
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
  iv: {
    type: String,
    required: false
  },
  seen: {
    type: Boolean,
    default: false
  },
  seenAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'chatmeesage'
});

messageSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    const { iv, content } = encryptText(this.content);
    this.content = content;
    this.iv = iv;
  }
  next();
});

messageSchema.methods.getDecryptedContent = function() {
  return decryptText(this.content, this.iv);
};

messageSchema.statics.decryptContent = function(content, iv) {
  return decryptText(content, iv);
};

messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: parseInt(process.env.MESSAGE_TTL) || 86400 });

module.exports = mongoose.model('Message', messageSchema);
