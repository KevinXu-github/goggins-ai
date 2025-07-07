const express = require('express');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Import database components
const DatabaseConnection = require('./database/connection');
const DatabaseService = require('./services/DatabaseService');

// Import auth routes and middleware
const authRoutes = require('./routes/auth');
const { requireAuth, requireAuthPage } = require('./middleware/auth');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Create audio cache directory
const audioDir = path.join(__dirname, 'audio_cache');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

// Session configuration with MongoDB store
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: true,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/goggins-chatbot',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: { 
    secure: false, // Set to true for HTTPS in production
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
}));

// Generate session ID if not exists
app.use((req, res, next) => {
  if (!req.session.userId) {
    req.session.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  next();
});

// Register auth routes FIRST
app.use('/api/auth', authRoutes);

// Authentication-related routes (BEFORE static files)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// Protect the main page with authentication
app.get('/', requireAuthPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API key endpoint
app.get('/api-key', (req, res) => {
  if (process.env.OPENAI_API_KEY) {
    res.json({ key: process.env.OPENAI_API_KEY });
  } else {
    res.status(404).json({ error: 'API key not found in environment variables' });
  }
});

// Chat endpoint with MongoDB integration
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const sessionId = req.session.userId;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    console.log(`Chat request from session ${sessionId}: ${message.substring(0, 50)}...`);
    
    // Save user message to database
    await DatabaseService.addMessage(sessionId, 'user', message);
    
    // Get user settings for AI response
    const userSettings = await DatabaseService.getSettings(sessionId);
    const systemPrompt = createSystemPrompt(userSettings.intensity);
    
    // Generate AI response (your existing logic)
    const aiResponse = await getOpenAIResponse(message, systemPrompt);
    
    // Save AI response to database
    await DatabaseService.addMessage(sessionId, 'ai', aiResponse);
    
    res.json({ 
      response: aiResponse,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get conversation history
app.get('/api/history', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const conversationId = req.query.conversationId || null;
    
    const messages = await DatabaseService.getConversationHistory(sessionId, conversationId);
    res.json({ messages });
    
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Failed to get conversation history' });
  }
});

// Settings endpoints
app.post('/api/settings', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const settings = await DatabaseService.updateSettings(sessionId, req.body);
    res.json({ settings });
    
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const settings = await DatabaseService.getSettings(sessionId);
    res.json({ settings });
    
  } catch (error) {
    console.error('Settings get error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Conversation management endpoints
app.get('/api/conversations', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const conversations = await DatabaseService.getConversations(sessionId);
    res.json({ conversations });
    
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const { title } = req.body;
    const conversation = await DatabaseService.createConversation(sessionId, title);
    res.json({ conversation });
    
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

app.put('/api/conversations/:id/switch', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const conversationId = req.params.id;
    const conversation = await DatabaseService.switchConversation(sessionId, conversationId);
    res.json({ conversation });
    
  } catch (error) {
    console.error('Switch conversation error:', error);
    res.status(500).json({ error: 'Failed to switch conversation' });
  }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const conversationId = req.params.id;
    await DatabaseService.deleteConversation(sessionId, conversationId);
    res.json({ success: true });
    
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Database status endpoint
app.get('/api/db-status', async (req, res) => {
  try {
    const status = DatabaseConnection.getConnectionStatus();
    const sessionId = req.session.userId;
    
    // Get user stats if connected
    let userStats = null;
    if (status.isConnected) {
      try {
        const user = await DatabaseService.getOrCreateUser(sessionId);
        userStats = user.getConversationStats();
      } catch (err) {
        console.error('Error getting user stats:', err);
      }
    }
    
    res.json({
      database: status,
      userStats,
      sessionId
    });
    
  } catch (error) {
    console.error('DB status error:', error);
    res.status(500).json({ error: 'Failed to get database status' });
  }
});

// Search conversations endpoint
app.get('/api/search', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const { q: searchTerm, limit = 10 } = req.query;
    
    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const results = await DatabaseService.searchConversations(sessionId, searchTerm, parseInt(limit));
    res.json({ results });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search conversations' });
  }
});

// User stats endpoint
app.get('/api/user-stats', async (req, res) => {
  try {
    const sessionId = req.session.userId;
    const stats = await DatabaseService.getUserStats(sessionId);
    res.json({ stats });
    
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

// OpenAI TTS endpoint
app.post('/api/tts', async (req, res) => {
  console.log("TTS request received:", req.body.text?.substring(0, 30) + "...");
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("No API key configured on server");
      return res.status(400).json({ error: 'API key not configured on server' });
    }
    
    const { text, voice, speed } = req.body;
    
    if (!text) {
      console.error("Text is required for TTS");
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      console.error("Invalid voice for OpenAI TTS:", voice);
      return res.status(400).json({ error: 'Invalid voice parameter', validVoices });
    }
    
    console.log(`Processing OpenAI TTS request: voice=${voice}, speed=${speed}`);
    
    const response = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/audio/speech',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        model: 'tts-1',
        input: text,
        voice: voice,
        speed: speed || 1.0
      },
      responseType: 'arraybuffer'
    });
    
    console.log("Received TTS response from OpenAI");
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
    
  } catch (error) {
    console.error('OpenAI TTS API Error:', error.response?.status, error.message);
    res.status(500).json({ 
      error: 'Failed to generate speech with OpenAI',
      details: error.message
    });
  }
});

// Tortoise-TTS endpoint
app.post('/api/tortoise-tts', async (req, res) => {
  console.log("Tortoise-TTS request received:", req.body.text?.substring(0, 30) + "...");
  
  let hasResponded = false;
  
  try {
    const { text, voice, preset } = req.body;
    
    if (!text) {
      console.error("Text is required for Tortoise-TTS");
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const textHash = crypto.createHash('md5').update(text).digest('hex');
    const voiceStr = voice || 'goggins';
    const presetStr = preset || 'fast';
    
    const outputFilename = `${textHash}_${voiceStr}_${presetStr}.wav`;
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const outputPath = path.join(outputDir, outputFilename);
    
    if (fs.existsSync(outputPath)) {
      console.log(`Using cached Tortoise-TTS audio: ${outputFilename}`);
      return res.sendFile(outputPath);
    }
    
    console.log(`Generating speech with Tortoise-TTS: "${text.substring(0, 30)}..."`);
    
    const pythonScript = path.join(__dirname, 'generate_speech.py');
    if (!fs.existsSync(pythonScript)) {
      console.error("Tortoise-TTS Python script not found:", pythonScript);
      return res.status(500).json({ 
        error: 'Tortoise-TTS not configured', 
        details: 'Python script not found' 
      });
    }
    
    const voiceSamplesDir = path.join(__dirname, 'voice_samples');
    if (!fs.existsSync(voiceSamplesDir)) {
      console.error("Voice samples directory not found:", voiceSamplesDir);
      return res.status(500).json({ 
        error: 'Voice samples not found', 
        details: 'Run clone_voice.py first to create voice samples' 
      });
    }
    
    const sendResponse = (statusCode, data) => {
      if (hasResponded) {
        console.log("Response already sent, ignoring duplicate response attempt");
        return;
      }
      hasResponded = true;
      
      if (statusCode === 200 && typeof data === 'string') {
        res.sendFile(data);
      } else {
        res.status(statusCode).json(data);
      }
    };
    
    const pythonProcess = spawn('python', [
      pythonScript,
      '--text', text,
      '--voice_dir', voiceSamplesDir,
      '--output', outputFilename,
      '--quality', presetStr
    ]);
    
    let pythonOutput = '';
    let pythonError = '';
    
    pythonProcess.stdout.on('data', (data) => {
      pythonOutput += data.toString();
      console.log(`Tortoise-TTS output: ${data.toString().trim()}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
      const errorText = data.toString().trim();
      
      if (!errorText.includes('FutureWarning') && 
          !errorText.includes('This IS expected') && 
          !errorText.includes('%|') &&
          !errorText.includes('it/s') && 
          !errorText.includes('weight_norm') &&
          !errorText.includes('Wav2Vec2ForCTC')) {
        console.error(`Tortoise-TTS error: ${errorText}`);
      } else if (errorText.includes('%|')) {
        const progressMatch = errorText.match(/(\d+)%/);
        if (progressMatch) {
          console.log(`Tortoise-TTS progress: ${progressMatch[1]}%`);
        }
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Tortoise-TTS process closed with code: ${code}`);
      
      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          console.log(`Successfully generated Tortoise-TTS speech: ${outputFilename}`);
          sendResponse(200, outputPath);
        } else {
          console.error('Tortoise-TTS completed but did not generate an output file');
          sendResponse(500, { 
            error: 'Failed to generate speech file',
            details: 'Output file was not created despite successful completion'
          });
        }
      } else {
        console.error(`Tortoise-TTS process failed with code ${code}`);
        
        let meaningfulError = 'Python process failed';
        if (pythonError.includes('ModuleNotFoundError')) {
          meaningfulError = 'Missing required Python modules for Tortoise-TTS';
        } else if (pythonError.includes('CUDA')) {
          meaningfulError = 'CUDA/GPU issue with Tortoise-TTS';
        } else if (pythonError.includes('voice_dir')) {
          meaningfulError = 'Voice samples directory issue';
        } else if (pythonOutput.includes('Error') || pythonError.includes('Error')) {
          const errorLines = (pythonOutput + pythonError).split('\n').filter(line => 
            line.includes('Error') && !line.includes('FutureWarning')
          );
          if (errorLines.length > 0) {
            meaningfulError = errorLines[0].trim();
          }
        }
        
        sendResponse(500, { 
          error: 'Failed to generate speech with Tortoise-TTS', 
          details: meaningfulError,
          exitCode: code
        });
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Tortoise-TTS process:', error);
      sendResponse(500, { 
        error: 'Failed to start Tortoise-TTS process',
        details: error.message
      });
    });
    
    const timeout = setTimeout(() => {
      if (!hasResponded) {
        console.log('Tortoise-TTS generation timeout after 10 minutes - killing process');
        pythonProcess.kill('SIGTERM');
        
        setTimeout(() => {
          if (!pythonProcess.killed) {
            console.log('Force killing Tortoise-TTS process');
            pythonProcess.kill('SIGKILL');
          }
        }, 5000);
        
        sendResponse(408, { 
          error: 'Tortoise-TTS generation timeout',
          details: 'Speech generation took longer than 10 minutes',
          suggestion: 'This is normal for Tortoise-TTS. Consider using OpenAI voices for faster response.'
        });
      }
    }, 600000); // 10 minute timeout
    
    pythonProcess.on('close', () => {
      clearTimeout(timeout);
    });
    
  } catch (error) {
    console.error('Error with Tortoise-TTS:', error);
    if (!hasResponded) {
      res.status(500).json({ 
        error: 'Failed to process Tortoise-TTS request',
        details: error.message
      });
    }
  }
});

// Test endpoints
app.get('/api/test-key', (req, res) => {
  if (process.env.OPENAI_API_KEY) {
    const keyPreview = process.env.OPENAI_API_KEY.substring(0, 5) + "...";
    res.json({ 
      keyAvailable: true,
      keyFirstChars: keyPreview
    });
  } else {
    res.json({ 
      keyAvailable: false,
      keyFirstChars: "none"
    });
  }
});

app.get('/api/test-tortoise', (req, res) => {
  const checks = {
    pythonScript: fs.existsSync(path.join(__dirname, 'generate_speech.py')),
    voiceSamples: fs.existsSync(path.join(__dirname, 'voice_samples')),
    audioCache: fs.existsSync(audioDir)
  };
  
  const allGood = Object.values(checks).every(check => check);
  
  res.json({
    ready: allGood,
    checks: checks,
    message: allGood ? 'Tortoise-TTS is ready' : 'Tortoise-TTS setup incomplete'
  });
});

// Static file serving MUST come LAST
app.use(express.static(path.join(__dirname)));

// Helper functions
async function getOpenAIResponse(message, systemPrompt) {
  try {
    console.log("Getting OpenAI response for message:", message);
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("No API key available");
    }

    const response = await axios({
      method: 'post',
      url: 'https://api.openai.com/v1/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      data: {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 256
      }
    });

    const responseText = response.data.choices[0].message.content.trim();
    console.log("Received response:", responseText);
    return responseText;
    
  } catch (error) {
    console.error("Error with OpenAI:", error);
    return "I can't provide a response right now. Please make sure you've set up your OpenAI API key correctly.";
  }
}

function createSystemPrompt(intensity) {
  let basePrompt = "You are David Goggins, a former Navy SEAL, ultramarathon runner, and motivational speaker known for mental toughness and pushing beyond limits. Respond as David Goggins would, using his direct, no-excuses style and occasional profanity.";
  
  switch (intensity) {
    case 'challenging':
      return basePrompt + " Be challenging but supportive, focusing on pushing people beyond their perceived limits. Use phrases like 'stay hard', 'embrace the suck', and 'callus your mind'. Remind people that discomfort is where growth happens.";
    
    case 'reflective':
      return basePrompt + " Be reflective and share personal stories and lessons from your journey. Talk about your transformation from overweight to ultramarathoner, or your SEAL training experiences. Connect these to the person's challenges.";
    
    case 'drill':
      return basePrompt + " Act like a drill instructor - be loud (USE CAPS), intense, and in-your-face. Challenge excuses immediately. Be extremely direct and forceful. Call out weakness and demand action. Use short, powerful sentences.";
    
    default:
      return basePrompt + " Focus on mental toughness, accountability, and pushing beyond comfort zones.";
  }
}

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await DatabaseConnection.connect();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Goggins Chatbot server running on port ${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} to start getting motivated!`);
      console.log(`💪 Database: Connected and ready`);
      console.log(`🔑 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
      
      // Check Tortoise-TTS setup
      const pythonScriptExists = fs.existsSync(path.join(__dirname, 'generate_speech.py'));
      const voiceSamplesExist = fs.existsSync(path.join(__dirname, 'voice_samples'));
      
      console.log(`🎤 Tortoise-TTS: ${pythonScriptExists && voiceSamplesExist ? 'Ready' : 'Setup incomplete'}`);
      
      if (!pythonScriptExists || !voiceSamplesExist) {
        console.log('   Run clone_voice.py to set up Tortoise-TTS voice cloning');
      }
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down ...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down ...');
  await DatabaseConnection.disconnect();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await DatabaseConnection.disconnect();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await DatabaseConnection.disconnect();
  process.exit(1);
});

startServer();