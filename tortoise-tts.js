// tortoise-tts.js with proper timeout handling

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
      const voiceStr = voice || 'goggins';
      const presetStr = preset || 'fast';
      
      const outputFilename = `${textHash}_${voiceStr}_${presetStr}.wav`;
      const outputPath = path.join(audioDir, outputFilename);
      
      // Check if we already have this audio cached
      if (fs.existsSync(outputPath)) {
        console.log(`Using cached audio: ${outputFilename}`);
        return res.sendFile(outputPath);
      }
      
      console.log(`Tortoise-TTS request received: ${text.substring(0, 30)}...`);
      console.log(`Generating speech with Tortoise-TTS: "${text.substring(0, 30)}..."`);
      console.log(`Voice: ${voiceStr}, Preset: ${presetStr}`);
      
      // Call Tortoise-TTS Python script
      const tortoisePath = process.env.TORTOISE_PATH || '/path/to/tortoise-tts';
      
      // Set timeout based on preset (in milliseconds)
      const timeouts = {
        'ultra_fast': 5 * 60 * 1000,    // 5 minutes
        'fast': 10 * 60 * 1000,         // 10 minutes  
        'standard': 15 * 60 * 1000,     // 15 minutes
        'high_quality': 20 * 60 * 1000  // 20 minutes
      };
      
      const timeoutMs = timeouts[presetStr] || 10 * 60 * 1000; // Default 10 minutes
      console.log(`Setting timeout to: ${timeoutMs / 1000} seconds`);
      
      // Spawn Python process
      const pythonProcess = spawn('python', [
        path.join(tortoisePath, 'tts.py'),
        '--text', text,
        '--voice', voiceStr,
        '--preset', presetStr,
        '--output_path', outputPath
      ], {
        // Add process options for better handling
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });
      
      let pythonError = '';
      let processCompleted = false;
      let responseAlreadySent = false;
      
      // Set up timeout
      const timeoutHandle = setTimeout(() => {
        if (!processCompleted && !responseAlreadySent) {
          console.log(`Tortoise-TTS generation timeout after ${timeoutMs / 1000} seconds - killing process`);
          
          // Kill the process
          pythonProcess.kill('SIGTERM');
          
          // Try SIGKILL if SIGTERM doesn't work
          setTimeout(() => {
            if (!processCompleted) {
              pythonProcess.kill('SIGKILL');
            }
          }, 5000);
          
          responseAlreadySent = true;
          return res.status(408).json({ 
            error: 'TTS generation timeout',
            message: `Process exceeded ${timeoutMs / 1000} second limit`
          });
        }
      }, timeoutMs);
      
      pythonProcess.stderr.on('data', (data) => {
        pythonError += data.toString();
        console.error(`Tortoise-TTS error: ${data}`);
      });
      
      pythonProcess.stdout.on('data', (data) => {
        console.log(`Tortoise-TTS output: ${data}`);
      });
      
      pythonProcess.on('close', (code) => {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        
        console.log(`Tortoise-TTS process closed with code: ${code}`);
        
        if (responseAlreadySent) {
          console.log('Response already sent, ignoring duplicate response attempt');
          return;
        }
        
        if (code !== 0) {
          console.error(`Tortoise-TTS process failed with code ${code}`);
          console.error(pythonError);
          responseAlreadySent = true;
          return res.status(500).json({ 
            error: 'Failed to generate speech', 
            details: pythonError,
            exitCode: code
          });
        }
        
        // Check if file was created
        if (fs.existsSync(outputPath)) {
          console.log(`Successfully generated speech: ${outputFilename}`);
          responseAlreadySent = true;
          return res.sendFile(outputPath);
        } else {
          console.error('Tortoise-TTS did not generate an output file');
          responseAlreadySent = true;
          return res.status(500).json({ error: 'Failed to generate speech file' });
        }
      });
      
      pythonProcess.on('error', (error) => {
        processCompleted = true;
        clearTimeout(timeoutHandle);
        
        if (!responseAlreadySent) {
          console.error('Python process error:', error);
          responseAlreadySent = true;
          return res.status(500).json({ 
            error: 'Failed to start TTS process',
            details: error.message
          });
        }
      });
      
    } catch (error) {
      console.error('Error with Tortoise-TTS:', error);
      if (!responseAlreadySent) {
        res.status(500).json({ 
          error: 'Failed to process TTS request',
          details: error.message
        });
      }
    }
  });
  
  console.log('Tortoise-TTS endpoints registered');
};

// ----------------------------------------------------
// FRONT-END IMPLEMENTATION (Updated)
// ----------------------------------------------------

// Extend the voiceChat object with improved Tortoise-TTS functionality
Object.assign(voiceChat, {
  // Configuration for Tortoise-TTS
  tortoiseConfig: {
    enabled: true,
    voiceName: 'goggins',
    preset: 'fast',
    useForAll: true,
    fallbackToDefault: true,
    clientTimeout: 12 * 60 * 1000  // 12 minutes client-side timeout
  },
  
  // Generate speech using Tortoise-TTS with proper timeout handling
  generateTortoiseAudio: async function(text) {
    console.log("Generating speech with Tortoise-TTS:", text.substring(0, 30) + "...");
    
    const cacheKey = `tortoise_${this.tortoiseConfig.voiceName}_${text}`;
    
    if (this.audioCache.has(cacheKey)) {
      console.log("Using cached Tortoise-TTS audio");
      return this.audioCache.get(cacheKey);
    }
    
    try {
      // Create AbortController for client-side timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.log('Client-side timeout reached for Tortoise-TTS request');
      }, this.tortoiseConfig.clientTimeout);
      
      console.log(`Starting Tortoise-TTS request with ${this.tortoiseConfig.clientTimeout / 1000}s timeout...`);
      
      const response = await fetch('/api/tortoise-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: this.tortoiseConfig.voiceName,
          preset: this.tortoiseConfig.preset
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Tortoise-TTS API error:", response.status, errorData);
        throw new Error(`Tortoise-TTS API error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      this.audioCache.set(cacheKey, audioUrl);
      console.log("Successfully generated and cached Tortoise-TTS audio");
      
      return audioUrl;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error("Tortoise-TTS request was aborted due to timeout");
      } else {
        console.error("Error with Tortoise-TTS:", error);
      }
      
      if (this.tortoiseConfig.fallbackToDefault) {
        console.log("Falling back to default TTS");
        return this.originalTextToSpeech(text);
      }
      
      return null;
    }
  },
  
  // Rest of the methods remain the same...
  initTortoiseTTS: function() {
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
    this.addTortoiseVoiceOption();
  },
  
  saveTortoiseSettings: function() {
    localStorage.setItem('gogginsTortoiseSettings', JSON.stringify(this.tortoiseConfig));
    console.log("Tortoise-TTS settings saved");
  },
  
  addTortoiseVoiceOption: function() {
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect && !voiceSelect.querySelector('option[value="tortoise_goggins"]')) {
      const option = document.createElement('option');
      option.value = 'tortoise_goggins';
      option.textContent = 'David Goggins (Tortoise-TTS)';
      voiceSelect.insertBefore(option, voiceSelect.firstChild);
      
      if (this.tortoiseConfig.enabled) {
        voiceSelect.value = 'tortoise_goggins';
      }
      console.log("Added Tortoise-TTS Goggins voice option");
    }
  },
  
  textToSpeechWithTortoise: async function(text) {
    if (this.settings.voice === 'tortoise_goggins' && this.tortoiseConfig.enabled) {
      return this.generateTortoiseAudio(text);
    } else {
      return this.originalTextToSpeech(text);
    }
  },
  
  setupTortoiseTTS: function() {
    this.originalTextToSpeech = this.textToSpeech;
    this.textToSpeech = this.textToSpeechWithTortoise;
    this.initTortoiseTTS();
    this.addTortoiseControls();
    console.log("Tortoise-TTS integration set up");
  },
  
  addTortoiseControls: function() {
    const settingsContent = document.querySelector('.settings-content');
    if (!settingsContent) return;
    
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
          <option value="ultra_fast" ${this.tortoiseConfig.preset === 'ultra_fast' ? 'selected' : ''}>Ultra Fast (5 min timeout)</option>
          <option value="fast" ${this.tortoiseConfig.preset === 'fast' ? 'selected' : ''}>Fast (10 min timeout)</option>
          <option value="standard" ${this.tortoiseConfig.preset === 'standard' ? 'selected' : ''}>Standard (15 min timeout)</option>
          <option value="high_quality" ${this.tortoiseConfig.preset === 'high_quality' ? 'selected' : ''}>High Quality (20 min timeout)</option>
        </select>
      </div>
    `;
    
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
  originalVoiceChatInit.call(this);
  this.setupTortoiseTTS();
};