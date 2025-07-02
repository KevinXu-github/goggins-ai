const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user', 'ai'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  audioCache: {
    voiceType: String,
    fileUrl: String,
    cacheKey: String,
    duration: Number,
    fileSize: Number
  }
}, { _id: true });

const conversationSchema = new mongoose.Schema({
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const userSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true
    // REMOVED: unique: true and index: true to prevent duplicates
  },
  settings: {
    name: {
      type: String,
      default: 'Goggins Bot'
    },
    intensity: {
      type: String,
      enum: ['challenging', 'reflective', 'drill'],
      default: 'challenging'
    },
    voice: {
      type: String,
      default: 'onyx'
    },
    primaryColor: {
      type: String,
      default: '#1a1a1a'
    },
    showTimestamps: {
      type: Boolean,
      default: false
    },
    darkMode: {
      type: Boolean,
      default: true
    },
    voiceEnabled: {
      type: Boolean,
      default: true
    },
    speechInputEnabled: {
      type: Boolean,
      default: false
    },
    voiceSpeed: {
      type: Number,
      default: 1.1
    }
  },
  conversations: [conversationSchema],
  currentConversationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt
});

// CLEAN INDEX DEFINITIONS - Only define each index once
userSchema.index({ sessionId: 1 }, { unique: true });
userSchema.index({ updatedAt: 1 });

// Pre-save middleware to update lastActiveAt
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods to get conversation stats
userSchema.methods.getConversationStats = function() {
  return {
    totalConversations: this.conversations.length,
    totalMessages: this.conversations.reduce((total, conv) => total + conv.messages.length, 0),
    activeConversations: this.conversations.filter(conv => conv.isActive).length
  };
};

module.exports = mongoose.model('User', userSchema);