const express = require('express');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware to parse JSON requests
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API key endpoint
app.get('/api-key', (req, res) => {
  if (process.env.OPENAI_API_KEY) {
    res.json({ key: process.env.OPENAI_API_KEY });
  } else {
    res.status(404).json({ error: 'API key not found in environment variables' });
  }
});

// Proxy endpoint for OpenAI TTS
app.post('/api/tts', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ error: 'API key not configured on server' });
    }
    
    const { text, voice, speed } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Call OpenAI API
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
        voice: voice || 'onyx',
        speed: speed || 1.0
      },
      responseType: 'arraybuffer'
    });
    
    // Set appropriate headers
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
    
  } catch (error) {
    console.error('TTS API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.response?.data || error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`OpenAI API Key ${process.env.OPENAI_API_KEY ? 'is' : 'is NOT'} available`);
});