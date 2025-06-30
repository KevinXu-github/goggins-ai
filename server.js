const express = require('express');
const path = require('path');
const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Add middleware to parse JSON requests
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// Create audio cache directory
const audioDir = path.join(__dirname, 'audio_cache');
if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
}

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
    
    // Validate voice parameter for OpenAI
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    if (!validVoices.includes(voice)) {
      console.error("Invalid voice for OpenAI TTS:", voice);
      return res.status(400).json({ error: 'Invalid voice parameter', validVoices });
    }
    
    console.log(`Processing OpenAI TTS request: voice=${voice}, speed=${speed}`);
    
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
        voice: voice,
        speed: speed || 1.0
      },
      responseType: 'arraybuffer'
    });
    
    console.log("Received TTS response from OpenAI");
    
    // Set appropriate headers
    res.set('Content-Type', 'audio/mpeg');
    res.send(response.data);
    
  } catch (error) {
    console.error('OpenAI TTS API Error:', error.response?.status, error.message);
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
      error: 'Failed to generate speech with OpenAI',
      details: error.message
    });
  }
});

// FIXED Tortoise-TTS endpoint with proper timeout and progress handling
app.post('/api/tortoise-tts', async (req, res) => {
  console.log("Tortoise-TTS request received:", req.body.text?.substring(0, 30) + "...");
  
  let hasResponded = false; // Track if we've already sent a response
  
  try {
    const { text, voice, preset } = req.body;
    
    if (!text) {
      console.error("Text is required for Tortoise-TTS");
      return res.status(400).json({ error: 'Text is required' });
    }
    
    // Generate a unique hash for this text to use as a cache key
    const textHash = crypto.createHash('md5').update(text).digest('hex');
    const voiceStr = voice || 'goggins';
    const presetStr = preset || 'fast';
    
    const outputFilename = `${textHash}_${voiceStr}_${presetStr}.wav`;
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }
    const outputPath = path.join(outputDir, outputFilename);
    
    // Check if we already have this audio cached
    if (fs.existsSync(outputPath)) {
      console.log(`Using cached Tortoise-TTS audio: ${outputFilename}`);
      return res.sendFile(outputPath);
    }
    
    console.log(`Generating speech with Tortoise-TTS: "${text.substring(0, 30)}..."`);
    console.log(`Voice: ${voiceStr}, Preset: ${presetStr}`);
    
    // Check if Python script exists
    const pythonScript = path.join(__dirname, 'generate_speech.py');
    if (!fs.existsSync(pythonScript)) {
      console.error("Tortoise-TTS Python script not found:", pythonScript);
      return res.status(500).json({ 
        error: 'Tortoise-TTS not configured', 
        details: 'Python script not found' 
      });
    }
    
    // Check if voice samples directory exists
    const voiceSamplesDir = path.join(__dirname, 'voice_samples');
    if (!fs.existsSync(voiceSamplesDir)) {
      console.error("Voice samples directory not found:", voiceSamplesDir);
      return res.status(500).json({ 
        error: 'Voice samples not found', 
        details: 'Run clone_voice.py first to create voice samples' 
      });
    }
    
    // Helper function to send response only once
    const sendResponse = (statusCode, data) => {
      if (hasResponded) {
        console.log("Response already sent, ignoring duplicate response attempt");
        return;
      }
      hasResponded = true;
      
      if (statusCode === 200 && typeof data === 'string') {
        // Sending file
        res.sendFile(data);
      } else {
        // Sending JSON error
        res.status(statusCode).json(data);
      }
    };
    
    // Spawn a Python process to run Tortoise-TTS
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
    
    // FIXED: Better progress bar and error handling
    pythonProcess.stderr.on('data', (data) => {
      pythonError += data.toString();
      const errorText = data.toString().trim();
      
      // Filter out progress bars and common warnings
      if (!errorText.includes('FutureWarning') && 
          !errorText.includes('This IS expected') && 
          !errorText.includes('%|') &&  // Progress bars
          !errorText.includes('it/s') && // Progress indicators
          !errorText.includes('weight_norm') &&
          !errorText.includes('Wav2Vec2ForCTC')) {
        console.error(`Tortoise-TTS error: ${errorText}`);
      } else if (errorText.includes('%|')) {
        // This is a progress bar - log it as progress, not error
        const progressMatch = errorText.match(/(\d+)%/);
        if (progressMatch) {
          console.log(`Tortoise-TTS progress: ${progressMatch[1]}%`);
        }
      }
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Tortoise-TTS process closed with code: ${code}`);
      
      if (code === 0) {
        // Success case
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
        // Error case
        console.error(`Tortoise-TTS process failed with code ${code}`);
        
        // Extract meaningful error from Python output
        let meaningfulError = 'Python process failed';
        if (pythonError.includes('ModuleNotFoundError')) {
          meaningfulError = 'Missing required Python modules for Tortoise-TTS';
        } else if (pythonError.includes('CUDA')) {
          meaningfulError = 'CUDA/GPU issue with Tortoise-TTS';
        } else if (pythonError.includes('voice_dir')) {
          meaningfulError = 'Voice samples directory issue';
        } else if (pythonOutput.includes('Error') || pythonError.includes('Error')) {
          // Try to extract the actual error message
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
    
    // FIXED: Much longer timeout for Tortoise-TTS (it's genuinely slow)
    const timeout = setTimeout(() => {
      if (!hasResponded) {
        console.log('Tortoise-TTS generation timeout after 10 minutes - killing process');
        pythonProcess.kill('SIGTERM');
        
        // Give it a moment to clean up, then force kill if needed
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
    }, 600000); // 10 minute timeout (Tortoise-TTS is genuinely very slow)
    
    // Clean up timeout if process completes
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

// Test endpoint for Tortoise-TTS setup
app.get('/api/test-tortoise', (req, res) => {
  console.log("Testing Tortoise-TTS setup");
  
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`OpenAI API Key ${process.env.OPENAI_API_KEY ? 'is' : 'is NOT'} available`);
  
  // Check Tortoise-TTS setup on startup
  const pythonScriptExists = fs.existsSync(path.join(__dirname, 'generate_speech.py'));
  const voiceSamplesExist = fs.existsSync(path.join(__dirname, 'voice_samples'));
  
  console.log(`Tortoise-TTS Python script: ${pythonScriptExists ? 'Found' : 'Missing'}`);
  console.log(`Voice samples directory: ${voiceSamplesExist ? 'Found' : 'Missing'}`);
  
  if (pythonScriptExists && voiceSamplesExist) {
    console.log('Tortoise-TTS appears to be set up correctly');
  } else {
    console.log('Tortoise-TTS setup incomplete - run clone_voice.py first');
  }
});