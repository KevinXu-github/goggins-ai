// Add this to a new file named tortoise-tts.js

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configure the router
module.exports = function(app) {
  // Create a directory for the audio files if it doesn't exist
  const audioDir = path.join(__dirname, 'audio_cache');
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir);
  }
  
  // Endpoint for Tortoise-TTS generation
  app.post('/api/tortoise-tts', async (req, res) => {
    try {
      const { text, voice, preset } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }
      
      // Generate a unique hash for this text to use as a cache key
      const textHash = crypto.createHash('md5').update(text).digest('hex');
      const voiceStr = voice || 'goggins'; // Default to Goggins voice
      const presetStr = preset || 'fast'; // Options: ultra_fast, fast, standard, high_quality
      
      const outputFilename = `${textHash}_${voiceStr}_${presetStr}.wav`;
      const outputPath = path.join(audioDir, outputFilename);
      
      // Check if we already have this audio cached
      if (fs.existsSync(outputPath)) {
        console.log(`Using cached audio: ${outputFilename}`);
        return res.sendFile(outputPath);
      }
      
      console.log(`Generating speech with Tortoise-TTS: "${text.substring(0, 30)}..."`);
      console.log(`Voice: ${voiceStr}, Preset: ${presetStr}`);
      
      // Call Tortoise-TTS Python script
      // Adjust the path to your Tortoise-TTS installation
      const tortoisePath = process.env.TORTOISE_PATH || '/path/to/tortoise-tts';
      
      // Spawn a Python process to run Tortoise-TTS
      const pythonProcess = spawn('python', [
        path.join(tortoisePath, 'tts.py'),
        '--text', text,
        '--voice', voiceStr,
        '--preset', presetStr,
        '--output_path', outputPath
      ]);
      
      let pythonError = '';
      
      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
        console.error(`Tortoise-TTS error: ${data}`);
      });
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`Tortoise-TTS output: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Tortoise-TTS process exited with code ${code}`);
          console.error(pythonError);
          return res.status(500).json({ 
            error: 'Failed to generate speech', 
            details: pythonError
          });
        }
        
        // Check if file was created
        if (fs.existsSync(outputPath)) {
          console.log(`Successfully generated speech: ${outputFilename}`);
          return res.sendFile(outputPath);
        } else {
          console.error('Tortoise-TTS did not generate an output file');
          return res.status(500).json({ error: 'Failed to generate speech file' });
        }
      });
      
    } catch (error) {
      console.error('Error with Tortoise-TTS:', error);
      res.status(500).json({ 
        error: 'Failed to process TTS request',
        details: error.message
      });
    }
  });
  
  // Add to server.js:
  // const tortoiseTTS = require('./tortoise-tts');
  // tortoiseTTS(app);
  
  console.log('Tortoise-TTS endpoints registered');
};

// ----------------------------------------------------
// FRONT-END IMPLEMENTATION
// Add this to your voice-chat.js file
// ----------------------------------------------------

// Extend the voiceChat object with Tortoise-TTS functionality
Object.assign(voiceChat, {
  // Configuration for Tortoise-TTS
  tortoiseConfig: {
    enabled: true,                 // Toggle Tortoise-TTS on/off
    voiceName: 'goggins',          // The voice model you trained
    preset: 'fast',                // Voice generation quality preset
    useForAll: true,               // Use for all responses
    fallbackToDefault: true        // Fallback to OpenAI voices if Tortoise fails
  },
  
  // Initialize Tortoise-TTS settings
  initTortoiseTTS: function() {
    // Load Tortoise settings from localStorage
    const savedSettings = localStorage.getItem('gogginsTortoiseSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        this.tortoiseConfig = { ...this.tortoiseConfig, ...parsed };
        console.log("Tortoise-TTS settings loaded:", this.tortoiseConfig);
      } catch (e) {
        console.error('Error parsing Tortoise-TTS settings:', e);
      }
    }
    
    // Add Tortoise voice option to voice select dropdown
    this.addTortoiseVoiceOption();
  },
  
  // Save Tortoise-TTS settings
  saveTortoiseSettings: function() {
    localStorage.setItem('gogginsTortoiseSettings', JSON.stringify(this.tortoiseConfig));
    console.log("Tortoise-TTS settings saved");
  },
  
  // Add the Tortoise voice option to the voice selection dropdown
  addTortoiseVoiceOption: function() {
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
      // Check if option already exists
      if (!voiceSelect.querySelector('option[value="tortoise_goggins"]')) {
        // Create new option
        const option = document.createElement('option');
        option.value = 'tortoise_goggins';
        option.textContent = 'David Goggins (Tortoise-TTS)';
        
        // Insert at top of list
        voiceSelect.insertBefore(option, voiceSelect.firstChild);
        
        // Select by default if enabled
        if (this.tortoiseConfig.enabled) {
          voiceSelect.value = 'tortoise_goggins';
        }
        
        console.log("Added Tortoise-TTS Goggins voice option");
      }
    }
  },
  
  // Generate speech using Tortoise-TTS
  generateTortoiseAudio: async function(text) {
    console.log("Generating speech with Tortoise-TTS:", text.substring(0, 30) + "...");
    
    // Create a unique cache key for this text
    const cacheKey = `tortoise_${this.tortoiseConfig.voiceName}_${text}`;
    
    // Check cache first
    if (this.audioCache.has(cacheKey)) {
      console.log("Using cached Tortoise-TTS audio");
      return this.audioCache.get(cacheKey);
    }
    
    try {
      // Call the Tortoise-TTS endpoint
      const response = await fetch('/api/tortoise-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: this.tortoiseConfig.voiceName,
          preset: this.tortoiseConfig.preset
        })
      });
      
      if (!response.ok) {
        console.warn("Tortoise-TTS API error, falling back to standard voice");
        throw new Error(`Tortoise-TTS API error: ${response.status}`);
      }
      
      // Process the audio response
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Cache the audio
      this.audioCache.set(cacheKey, audioUrl);
      
      return audioUrl;
    } catch (error) {
      console.error("Error with Tortoise-TTS:", error);
      
      // Fall back to default TTS if enabled
      if (this.tortoiseConfig.fallbackToDefault) {
        console.log("Falling back to default TTS");
        return this.originalTextToSpeech(text);
      }
      
      return null;
    }
  },
  
  // Override the textToSpeech method to use Tortoise-TTS
  textToSpeechWithTortoise: async function(text) {
    // Check if Tortoise is selected in the dropdown
    if (this.settings.voice === 'tortoise_goggins' && this.tortoiseConfig.enabled) {
      return this.generateTortoiseAudio(text);
    } else {
      // Use original method for other voices
      return this.originalTextToSpeech(text);
    }
  },
  
  // Set up Tortoise-TTS integration
  setupTortoiseTTS: function() {
    // Save the original method for fallback
    this.originalTextToSpeech = this.textToSpeech;
    
    // Override with our Tortoise implementation
    this.textToSpeech = this.textToSpeechWithTortoise;
    
    // Initialize Tortoise settings
    this.initTortoiseTTS();
    
    // Add Tortoise UI controls to settings panel
    this.addTortoiseControls();
    
    console.log("Tortoise-TTS integration set up");
  },
  
  // Add Tortoise-TTS controls to the settings panel
  addTortoiseControls: function() {
    const settingsContent = document.querySelector('.settings-content');
    if (!settingsContent) return;
    
    // Create Tortoise settings section
    const tortoiseSection = document.createElement('div');
    tortoiseSection.className = 'setting-group';
    tortoiseSection.innerHTML = `
      <label>Tortoise-TTS Settings:</label>
      <div class="toggle-group" style="margin-top: 10px;">
        <label for="tortoise-enabled">Use Tortoise-TTS:</label>
        <label class="toggle-switch">
          <input type="checkbox" id="tortoise-enabled" ${this.tortoiseConfig.enabled ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div style="margin-top: 10px;">
        <label for="tortoise-preset">Generation Quality:</label>
        <select id="tortoise-preset" style="width: 100%; margin-top: 5px;">
          <option value="ultra_fast" ${this.tortoiseConfig.preset === 'ultra_fast' ? 'selected' : ''}>Ultra Fast (Lower Quality)</option>
          <option value="fast" ${this.tortoiseConfig.preset === 'fast' ? 'selected' : ''}>Fast (Balanced)</option>
          <option value="standard" ${this.tortoiseConfig.preset === 'standard' ? 'selected' : ''}>Standard (Better Quality)</option>
          <option value="high_quality" ${this.tortoiseConfig.preset === 'high_quality' ? 'selected' : ''}>High Quality (Slower)</option>
        </select>
      </div>
    `;
    
    // Insert before the settings footer
    const settingsFooter = document.querySelector('.settings-footer');
    if (settingsFooter) {
      settingsContent.insertBefore(tortoiseSection, settingsFooter);
    } else {
      settingsContent.appendChild(tortoiseSection);
    }
    
    // Add event listeners
    const tortoiseEnabled = document.getElementById('tortoise-enabled');
    if (tortoiseEnabled) {
      tortoiseEnabled.addEventListener('change', () => {
        this.tortoiseConfig.enabled = tortoiseEnabled.checked;
        this.saveTortoiseSettings();
        
        // Update voice selection
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect && this.tortoiseConfig.enabled) {
          voiceSelect.value = 'tortoise_goggins';
        }
      });
    }
    
    const tortoisePreset = document.getElementById('tortoise-preset');
    if (tortoisePreset) {
      tortoisePreset.addEventListener('change', () => {
        this.tortoiseConfig.preset = tortoisePreset.value;
        this.saveTortoiseSettings();
      });
    }
    
    console.log("Added Tortoise-TTS controls to settings panel");
  }
});

// Initialize Tortoise-TTS when voice chat initializes
const originalVoiceChatInit = voiceChat.init;
voiceChat.init = function() {
  // Call the original init method
  originalVoiceChatInit.call(this);
  
  // Set up Tortoise-TTS
  this.setupTortoiseTTS();
};