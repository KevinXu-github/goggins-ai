// voice-chat.js 

// Voice chat state
const voiceChat = {
    // Voice settings
    settings: {
        enabled: true,
        speechRecognitionEnabled: false,
        voice: 'onyx',  // Options: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'tortoise_goggins'
        model: 'tts-1',
        speed: 1.1      // Slightly faster for Goggins
    },
    
    // Speech recognition state
    recognition: null,
    isListening: false,
    
    // Audio cache to avoid regenerating the same messages
    audioCache: new Map(), // Maps text to audio URLs
    
    // Valid OpenAI voices
    validOpenAIVoices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    
    // Initialize voice chat functionality
    init: function() {
        console.log("Initializing voice chat");
        // Load settings from localStorage
        this.loadSettings();
        
        // Add custom voice options to dropdown
        this.addCustomVoiceOptions();
        
        // Initialize speech recognition if available in the browser
        if (this.settings.speechRecognitionEnabled) {
            this.initSpeechRecognition();
        }
    },
    
    // Add custom voice options to the dropdown
    addCustomVoiceOptions: function() {
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            // Check if Tortoise option already exists
            if (!voiceSelect.querySelector('option[value="tortoise_goggins"]')) {
                // Create new option for Tortoise-TTS
                const option = document.createElement('option');
                option.value = 'tortoise_goggins';
                option.textContent = 'David Goggins (Tortoise-TTS)';
                
                // Insert at top of list
                voiceSelect.insertBefore(option, voiceSelect.firstChild);
                
                console.log("Added Tortoise-TTS Goggins voice option");
            }
        }
    },
    
    // Save voice settings to localStorage
    saveSettings: function() {
        const settings = JSON.stringify(this.settings);
        localStorage.setItem('gogginsVoiceSettings', settings);
        console.log("Voice settings saved:", this.settings);
    },
    
    // Load voice settings from localStorage
    loadSettings: function() {
        const savedSettings = localStorage.getItem('gogginsVoiceSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
                console.log("Voice settings loaded:", this.settings);
            } catch (e) {
                console.error('Error parsing voice settings:', e);
            }
        } else {
            console.log("No saved voice settings found, using defaults");
        }
    },
    
    // Initialize speech recognition
    initSpeechRecognition: function() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            return false;
        }
        
        try {
            // Create speech recognition object
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            // Handle recognition results
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (transcript.trim()) {
                    const userInput = document.getElementById('user-input');
                    if (userInput) {
                        userInput.value = transcript;
                        // Trigger send button click
                        const sendBtn = document.getElementById('send-btn');
                        if (sendBtn) sendBtn.click();
                    }
                }
            };
            
            // Handle errors
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopListening();
            };
            
            // Handle end of speech
            this.recognition.onend = () => {
                this.stopListening();
            };
            
            console.log("Speech recognition initialized successfully");
            return true;
        } catch (e) {
            console.error('Error initializing speech recognition:', e);
            return false;
        }
    },
    
    // Start listening for speech input
    startListening: function() {
        if (!this.recognition && !this.initSpeechRecognition()) {
            console.error("Cannot start listening - speech recognition not available");
            return;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            console.log("Started listening for speech input");
            
            // Update UI to show listening state
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.classList.add('active');
                micBtn.querySelector('i').className = 'fas fa-microphone-slash';
            }
        } catch (e) {
            console.error('Error starting speech recognition:', e);
        }
    },
    
    // Stop listening for speech input
    stopListening: function() {
        if (this.recognition) {
            try {
                this.recognition.stop();
                console.log("Stopped listening for speech input");
            } catch (e) {
                // Ignore errors when stopping recognition
                console.warn("Error stopping recognition:", e);
            }
            
            this.isListening = false;
            
            // Update UI to show not listening state
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) {
                micBtn.classList.remove('active');
                micBtn.querySelector('i').className = 'fas fa-microphone';
            }
        }
    },
    
    // Toggle listening state
    toggleListening: function() {
        console.log("Toggling speech recognition:", this.isListening ? "OFF" : "ON");
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },
    
    // Show progress message to user
    showTortoiseProgress: function(message) {
        // Remove any existing progress message
        this.hideTortoiseProgress();
        
        // Create progress message element
        const progressDiv = document.createElement('div');
        progressDiv.id = 'tortoise-progress';
        progressDiv.className = 'ai-message tortoise-progress';
        progressDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-cog fa-spin" style="margin-right: 8px; color: #ff3b25;"></i>
                ${message}
            </div>
        `;
        
        // Add to chat
        const chatBox = document.getElementById('chat-box');
        if (chatBox) {
            chatBox.appendChild(progressDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    },

    // Hide progress message
    hideTortoiseProgress: function() {
        const progressDiv = document.getElementById('tortoise-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    },
    
    // Generate speech using Tortoise-TTS
    generateTortoiseAudio: async function(text) {
        console.log("Generating speech with Tortoise-TTS:", text.substring(0, 30) + "...");
        
        // Create a unique cache key for this text
        const cacheKey = `tortoise_goggins_${text}`;
        
        // Check cache first
        if (this.audioCache.has(cacheKey)) {
            console.log("Using cached Tortoise-TTS audio");
            return this.audioCache.get(cacheKey);
        }
        
        // Show user that Tortoise-TTS is starting (it takes time!)
        this.showTortoiseProgress("🎤 Starting Tortoise-TTS generation... This may take 5-10 minutes for high quality David Goggins voice. Stay hard!");
        
        try {
            // Call the Tortoise-TTS endpoint
            const response = await fetch('/api/tortoise-tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice: 'goggins',
                    preset: 'fast'
                })
            });
            
            if (!response.ok) {
                this.hideTortoiseProgress();
                console.warn("Tortoise-TTS API error, falling back to OpenAI voice");
                throw new Error(`Tortoise-TTS API error: ${response.status}`);
            }
            
            this.showTortoiseProgress("🔥 Tortoise-TTS generation completed! Processing audio...");
            
            // Process the audio response
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Cache the audio
            this.audioCache.set(cacheKey, audioUrl);
            
            this.hideTortoiseProgress();
            console.log("Tortoise-TTS generation successful!");
            
            return audioUrl;
        } catch (error) {
            this.hideTortoiseProgress();
            console.error("Error with Tortoise-TTS:", error);
            
            // Fall back to OpenAI TTS with a suitable voice
            console.log("Falling back to OpenAI TTS with 'onyx' voice");
            return this.generateOpenAIAudio(text, 'onyx');
        }
    },
    
    // Generate speech using OpenAI TTS
    generateOpenAIAudio: async function(text, voice = null) {
        const selectedVoice = voice || this.settings.voice;
        
        // Validate voice
        if (!this.validOpenAIVoices.includes(selectedVoice)) {
            console.error("Invalid OpenAI voice:", selectedVoice);
            return null;
        }
        
        console.log(`Generating speech with OpenAI TTS: voice=${selectedVoice}, speed=${this.settings.speed}`);
        
        // Create cache key
        const cacheKey = `openai_${selectedVoice}_${this.settings.speed}_${text}`;
        
        // Check cache first
        if (this.audioCache.has(cacheKey)) {
            console.log("Using cached OpenAI audio");
            return this.audioCache.get(cacheKey);
        }
        
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice: selectedVoice,
                    speed: this.settings.speed
                })
            });

            if (!response.ok) {
                console.error(`OpenAI TTS API error: ${response.status}`);
                throw new Error(`OpenAI TTS API error: ${response.status}`);
            }
            
            // Get blob from response
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log("Created OpenAI audio URL:", audioUrl);
            
            // Cache the audio URL
            this.audioCache.set(cacheKey, audioUrl);
            
            return audioUrl;
        } catch (error) {
            console.error('Error generating OpenAI speech:', error);
            return null;
        }
    },
    
    // Main text-to-speech function with proper routing
    textToSpeech: async function(text) {
        console.log("Converting text to speech:", text.substring(0, 30) + "...");
        console.log("Selected voice:", this.settings.voice);
        
        if (!this.settings.enabled) {
            console.log("Voice is disabled, skipping TTS");
            return null;
        }
        
        // Route to appropriate TTS system based on voice selection
        if (this.settings.voice === 'tortoise_goggins') {
            console.log("Routing to Tortoise-TTS");
            return this.generateTortoiseAudio(text);
        } else if (this.validOpenAIVoices.includes(this.settings.voice)) {
            console.log("Routing to OpenAI TTS");
            return this.generateOpenAIAudio(text);
        } else {
            console.error("Unknown voice type:", this.settings.voice);
            console.log("Falling back to OpenAI TTS with 'onyx' voice");
            return this.generateOpenAIAudio(text, 'onyx');
        }
    },
    
    // Play audio from URL
    playAudio: function(audioUrl) {
        if (!audioUrl) {
            console.warn("Cannot play audio - no URL provided");
            return;
        }
        
        const audioPlayer = document.getElementById('audio-player');
        if (audioPlayer) {
            console.log("Playing audio:", audioUrl);
            audioPlayer.src = audioUrl;
            audioPlayer.play();
        } else {
            console.error("Audio player element not found");
        }
    },
    
    // Create a play button for a message
    createPlayButton: function(text, audioUrl) {
        const playButton = document.createElement('button');
        playButton.className = 'play-voice-btn';
        playButton.innerHTML = '<i class="fas fa-play"></i> Play';
        
        playButton.addEventListener('click', async () => {
            // Show loading state
            playButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            try {
                // If we have an audio URL, use it; otherwise, generate one
                let url = audioUrl;
                if (!url && this.settings.enabled) {
                    console.log("No audio URL, generating new audio");
                    url = await this.textToSpeech(text);
                }
                
                // Play the audio
                if (url) {
                    this.playAudio(url);
                    // Update button state
                    playButton.innerHTML = '<i class="fas fa-play"></i> Play';
                } else {
                    console.error("Failed to get audio URL");
                    throw new Error('Failed to generate or play audio');
                }
            } catch (error) {
                console.error('Error playing audio:', error);
                playButton.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                setTimeout(() => {
                    playButton.innerHTML = '<i class="fas fa-play"></i> Retry';
                }, 2000);
            }
        });
        
        return playButton;
    },
    
    // Event handler setup for voice buttons
    setupEventListeners: function() {
        console.log("Setting up voice event listeners");
        
        // Mic button for speech recognition
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            console.log("Setting up mic button listener");
            micBtn.addEventListener('click', () => this.toggleListening());
        } else {
            console.error("Mic button not found");
        }
        
        // Voice toggle button
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            console.log("Setting up voice button listener");
            // Set initial state
            if (this.settings.enabled) {
                voiceBtn.classList.add('active');
            }
            
            voiceBtn.addEventListener('click', () => {
                voiceBtn.classList.toggle('active');
                this.settings.enabled = voiceBtn.classList.contains('active');
                console.log("Voice enabled changed to:", this.settings.enabled);
                this.saveSettings();
            });
        } else {
            console.error("Voice button not found");
        }
        
        // Settings panel voice toggles
        const voiceToggle = document.getElementById('voice-output');
        if (voiceToggle) {
            console.log("Setting up voice toggle in settings");
            voiceToggle.checked = this.settings.enabled;
            voiceToggle.addEventListener('change', () => {
                this.settings.enabled = voiceToggle.checked;
                console.log("Voice enabled changed to:", this.settings.enabled);
                
                // Update voice button state
                if (voiceBtn) {
                    if (this.settings.enabled) {
                        voiceBtn.classList.add('active');
                    } else {
                        voiceBtn.classList.remove('active');
                    }
                }
                
                this.saveSettings();
            });
        } else {
            console.error("Voice toggle in settings not found");
        }
        
        // Speech recognition toggle
        const speechToggle = document.getElementById('speech-input');
        if (speechToggle) {
            console.log("Setting up speech recognition toggle");
            speechToggle.checked = this.settings.speechRecognitionEnabled;
            speechToggle.addEventListener('change', () => {
                this.settings.speechRecognitionEnabled = speechToggle.checked;
                console.log("Speech recognition enabled changed to:", this.settings.speechRecognitionEnabled);
                
                if (this.settings.speechRecognitionEnabled && !this.recognition) {
                    this.initSpeechRecognition();
                }
                
                this.saveSettings();
            });
        } else {
            console.error("Speech toggle not found");
        }
        
        // Voice type selection
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            console.log("Setting up voice type selection");
            voiceSelect.value = this.settings.voice;
            voiceSelect.addEventListener('change', () => {
                const oldVoice = this.settings.voice;
                this.settings.voice = voiceSelect.value;
                console.log(`Voice type changed from '${oldVoice}' to '${this.settings.voice}'`);
                this.saveSettings();
                
                // Clear cache when voice changes to avoid playing wrong voice
                this.audioCache.clear();
                console.log("Audio cache cleared due to voice change");
            });
        } else {
            console.error("Voice select not found");
        }
        
        console.log("Voice event listeners setup complete");
    }
};