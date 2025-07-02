const User = require('../models/User.js');

class DatabaseService {
  
  // Get or create user by session ID
  async getOrCreateUser(sessionId) {
    try {
      let user = await User.findOne({ sessionId });
      
      if (!user) {
        console.log(`Creating new user for session: ${sessionId}`);
        user = new User({
          sessionId,
          conversations: [{
            title: 'Welcome to Goggins Bot',
            messages: [{
              type: 'ai',
              content: 'WHO\'S GONNA CARRY THE BOATS?! Welcome to your motivation station. I\'m here to push you beyond your limits and help you become the person you\'re meant to be. Stay hard!',
              timestamp: new Date()
            }]
          }]
        });
        
        // Set current conversation to the first one
        await user.save();
        user.currentConversationId = user.conversations[0]._id;
        await user.save();
        
        console.log(`New user created with ID: ${user._id}`);
      } else {
        console.log(`Existing user found: ${user._id}`);
      }
      
      return user;
    } catch (error) {
      console.error('Error getting/creating user:', error);
      throw error;
    }
  }

  // Add message to current conversation
  async addMessage(sessionId, type, content, audioCache = null) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      // Get current conversation or create new one
      let currentConversation;
      if (user.currentConversationId) {
        currentConversation = user.conversations.id(user.currentConversationId);
      }
      
      if (!currentConversation) {
        // Create new conversation
        const newConversation = {
          title: `Conversation ${user.conversations.length + 1}`,
          messages: []
        };
        user.conversations.push(newConversation);
        currentConversation = user.conversations[user.conversations.length - 1];
        user.currentConversationId = currentConversation._id;
      }

      // Add message
      const message = {
        type,
        content,
        timestamp: new Date(),
        audioCache
      };

      currentConversation.messages.push(message);
      currentConversation.updatedAt = new Date();
      
      await user.save();
      
      console.log(`Message added to conversation ${currentConversation._id}: ${type} - ${content.substring(0, 50)}...`);
      return message;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  // Get conversation history
  async getConversationHistory(sessionId, conversationId = null) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      if (conversationId) {
        const conversation = user.conversations.id(conversationId);
        return conversation ? conversation.messages : [];
      }
      
      // Return current conversation
      if (user.currentConversationId) {
        const currentConversation = user.conversations.id(user.currentConversationId);
        return currentConversation ? currentConversation.messages : [];
      }
      
      return [];
    } catch (error) {
      console.error('Error getting conversation history:', error);
      throw error;
    }
  }

  // Update user settings
  async updateSettings(sessionId, settings) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      // Merge new settings with existing settings
      user.settings = { ...user.settings.toObject(), ...settings };
      await user.save();
      
      console.log(`Settings updated for session ${sessionId}:`, settings);
      return user.settings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Get user settings
  async getSettings(sessionId) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      return user.settings;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  // Create new conversation
  async createConversation(sessionId, title = null) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      const newConversation = {
        title: title || `Conversation ${user.conversations.length + 1}`,
        messages: []
      };
      
      user.conversations.push(newConversation);
      user.currentConversationId = user.conversations[user.conversations.length - 1]._id;
      
      await user.save();
      
      console.log(`New conversation created: ${newConversation.title}`);
      return user.conversations[user.conversations.length - 1];
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get all conversations for a user
  async getConversations(sessionId) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      const conversations = user.conversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
        isActive: conv.isActive,
        isCurrent: user.currentConversationId && user.currentConversationId.toString() === conv._id.toString(),
        lastMessage: conv.messages.length > 0 ? {
          type: conv.messages[conv.messages.length - 1].type,
          content: conv.messages[conv.messages.length - 1].content.substring(0, 100),
          timestamp: conv.messages[conv.messages.length - 1].timestamp
        } : null
      }));
      
      // Sort by most recent first
      conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      return conversations;
    } catch (error) {
      console.error('Error getting conversations:', error);
      throw error;
    }
  }

  // Switch to different conversation
  async switchConversation(sessionId, conversationId) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      const conversation = user.conversations.id(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      user.currentConversationId = conversationId;
      await user.save();
      
      console.log(`Switched to conversation: ${conversation.title}`);
      return conversation;
    } catch (error) {
      console.error('Error switching conversation:', error);
      throw error;
    }
  }

  // Delete conversation
  async deleteConversation(sessionId, conversationId) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      const conversationIndex = user.conversations.findIndex(
        conv => conv._id.toString() === conversationId
      );
      
      if (conversationIndex === -1) {
        throw new Error('Conversation not found');
      }
      
      const deletedConversation = user.conversations[conversationIndex];
      user.conversations.splice(conversationIndex, 1);
      
      // If this was the current conversation, switch to most recent
      if (user.currentConversationId && user.currentConversationId.toString() === conversationId) {
        user.currentConversationId = user.conversations.length > 0 
          ? user.conversations[user.conversations.length - 1]._id 
          : null;
      }
      
      await user.save();
      
      console.log(`Deleted conversation: ${deletedConversation.title}`);
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Update conversation title
  async updateConversationTitle(sessionId, conversationId, newTitle) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      const conversation = user.conversations.id(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      conversation.title = newTitle;
      conversation.updatedAt = new Date();
      await user.save();
      
      console.log(`Updated conversation title to: ${newTitle}`);
      return conversation;
    } catch (error) {
      console.error('Error updating conversation title:', error);
      throw error;
    }
  }

  // Add audio cache information to a message
  async addAudioCacheToMessage(sessionId, messageId, audioCache) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      // Find the message in any conversation
      let targetMessage = null;
      let targetConversation = null;
      
      for (const conversation of user.conversations) {
        for (const message of conversation.messages) {
          if (message._id.toString() === messageId) {
            targetMessage = message;
            targetConversation = conversation;
            break;
          }
        }
        if (targetMessage) break;
      }
      
      if (!targetMessage) {
        throw new Error('Message not found');
      }
      
      targetMessage.audioCache = audioCache;
      targetConversation.updatedAt = new Date();
      await user.save();
      
      console.log(`Audio cache added to message: ${messageId}`);
      return targetMessage;
    } catch (error) {
      console.error('Error adding audio cache to message:', error);
      throw error;
    }
  }

  // Get user statistics
  async getUserStats(sessionId) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      const stats = user.getConversationStats();
      
      // Add more detailed stats
      const conversationStats = user.conversations.map(conv => ({
        id: conv._id,
        title: conv.title,
        messageCount: conv.messages.length,
        userMessages: conv.messages.filter(msg => msg.type === 'user').length,
        aiMessages: conv.messages.filter(msg => msg.type === 'ai').length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt
      }));
      
      return {
        ...stats,
        userId: user._id,
        sessionId: user.sessionId,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        settings: user.settings,
        conversations: conversationStats
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  // Clean up old conversations (maintenance function)
  async cleanupOldConversations(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await User.updateMany(
        {},
        {
          $pull: {
            conversations: {
              updatedAt: { $lt: cutoffDate },
              isActive: false
            }
          }
        }
      );
      
      console.log(`Cleaned up old conversations: ${result.modifiedCount} users affected`);
      return result;
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      throw error;
    }
  }

  // Get all users (admin function)
  async getAllUsers(limit = 50, skip = 0) {
    try {
      const users = await User.find({})
        .select('sessionId createdAt lastActiveAt settings')
        .sort({ lastActiveAt: -1 })
        .limit(limit)
        .skip(skip);
      
      return users.map(user => ({
        id: user._id,
        sessionId: user.sessionId,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
        settings: user.settings,
        stats: user.getConversationStats()
      }));
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Search conversations
  async searchConversations(sessionId, searchTerm, limit = 10) {
    try {
      const user = await this.getOrCreateUser(sessionId);
      
      const results = [];
      
      for (const conversation of user.conversations) {
        const matchingMessages = conversation.messages.filter(message =>
          message.content.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        if (matchingMessages.length > 0) {
          results.push({
            conversationId: conversation._id,
            conversationTitle: conversation.title,
            matchingMessages: matchingMessages.map(msg => ({
              id: msg._id,
              type: msg.type,
              content: msg.content,
              timestamp: msg.timestamp
            }))
          });
        }
      }
      
      return results.slice(0, limit);
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  }
}

module.exports = new DatabaseService();