const express = require('express');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process'); // Added for Python script execution
const fs = require('fs'); // Added for file system operations
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware to parse JSON requests
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API key endpoint
app.get('/api-key', (req, res) => {
  console.log("API key request received");
  if (process.env.OPENAI_API_KEY) {
    console.log("Returning API key (hidden for security)");
    res.json({ key: process.env.OPENAI_API_KEY });
  } else {
    console.log("No API key found in environment variables");
    res.status(404).json({ error: 'API key not found in environment variables' });
  }
});

// Proxy endpoint for OpenAI TTS
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
    
    console.log(`Processing TTS request: voice=${voice}, speed=${speed}`);
    
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
    
    console.log("Received TTS response from OpenAI");
    
    // Set appropriate headers
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
    
  } catch (error) {
    console.error('TTS API Error:', error.response?.status, error.message);
    if (error.response?.data) {
      try {
        // Try to parse the error data if it's in buffer format
        const errorData = JSON.parse(Buffer.from(error.response.data).toString());
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Error details not available in JSON format');
      }
    }
    
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message
    });
  }
});

// Test endpoint to verify API key
app.get('/api/test-key', (req, res) => {
  console.log("Testing API key:", process.env.OPENAI_API_KEY ? "Available" : "Missing");
  if (process.env.OPENAI_API_KEY) {
    // Only show first few characters for security
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

// Endpoint for generating speech with Goggins voice
app.post('/api/generate-speech', async (req, res) => {
  console.log('Generating speech for Goggins bot response');
  
  const { text, output = 'speech_output.wav' } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required for speech generation' });
  }
  
  // Make sure output directory exists
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    console.log(`Created output directory: ${outputDir}`);
  }
  
  // Create a safe filename
  const safeFilename = output.replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputFilename = safeFilename.endsWith('.wav') ? safeFilename : `${safeFilename}.wav`;
  const outputPath = path.join(outputDir, outputFilename);
  
  console.log(`Generating speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
  console.log(`Output file: ${outputPath}`);
  
  try {
    // Run Python script to generate speech
    const pythonProcess = spawn('python', [
      'generate_speech.py',
      '--text', text,
      '--output', outputFilename,
      '--quality', 'high'
    ]);
    
    let stdoutData = '';
    let stderrData = '';
    
    // Collect standard output
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
      console.log(`Python script output: ${data}`);
    });
    
    // Collect error output
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Python script error: ${data}`);
    });
    
    // Process completion
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        return res.status(500).json({
          error: 'Speech generation failed',
          details: stderrData || 'Unknown error'
        });
      }
      
      // Verify the file was created
      if (fs.existsSync(outputPath)) {
        console.log(`Speech generated successfully: ${outputFilename}`);
        res.json({
          success: true,
          audioUrl: `/output/${outputFilename}`
        });
      } else {
        console.error(`Output file was not created: ${outputPath}`);
        res.status(500).json({
          error: 'Output file not created',
          details: stdoutData + stderrData
        });
      }
    });
  } catch (error) {
    console.error('Error running Python script:', error.message);
    res.status(500).json({
      error: 'Failed to run speech generation script',
      details: error.message
    });
  }
});

// Make sure to serve files from the output directory
app.use('/output', express.static(path.join(__dirname, 'output')));

// Start the server (this should be at the end of the file)
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`OpenAI API Key ${process.env.OPENAI_API_KEY ? 'is' : 'is NOT'} available`);
});