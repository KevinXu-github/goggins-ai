require('dotenv').config();
const mongoose = require('mongoose');
const Auth = require('../models/Auth');

async function createDemoUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/goggins-chatbot');
    console.log('Connected to MongoDB');

    // Check if demo user already exists
    const existingDemo = await Auth.findOne({ username: 'demo' });
    if (existingDemo) {
      console.log('Demo user already exists');
      process.exit(0);
    }

    // Create demo user
    const demoUser = new Auth({
      username: 'demo',
      email: 'demo@gogginsbot.com',
      password: 'demo123' // Will be hashed automatically
    });

    await demoUser.save();
    console.log('✅ Demo user created successfully!');
    console.log('Username: demo');
    console.log('Password: demo123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating demo user:', error);
    process.exit(1);
  }
}

createDemoUser();