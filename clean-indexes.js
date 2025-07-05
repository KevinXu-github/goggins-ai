// clean-indexes.js

require('dotenv').config();
const mongoose = require('mongoose');

async function cleanIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔍 Checking existing indexes...');
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Get all current indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    // Drop all indexes except _id (MongoDB won't let you drop _id)
    console.log('🗑️ Dropping old indexes...');
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (err) {
          console.log(`Could not drop ${index.name}:`, err.message);
        }
      }
    }
    
    // Recreate the User model to rebuild indexes
    console.log('🔄 Recreating indexes...');
    const User = require('./models/User.js');
    await User.ensureIndexes();
    
    console.log('✅ Indexes cleaned and recreated successfully!');
    
    // Show final indexes
    const finalIndexes = await collection.indexes();
    console.log('Final indexes:', finalIndexes.map(idx => idx.name));
    
    await mongoose.disconnect();
    console.log('🎉 Done! Restart your server now.');
    
  } catch (error) {
    console.error('❌ Error cleaning indexes:', error);
    process.exit(1);
  }
}

cleanIndexes();