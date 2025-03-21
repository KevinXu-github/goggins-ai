// voice-chat.js - Handles the voice chat functionality

// Voice chat state
const voiceChat = {
    // Voice settings
    settings: {
        enabled: true,
        speechRecognitionEnabled: false,
        voice: 'onyx',  // Options: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
        model: 'tts-1',
        speed: 1.1      // Slightly faster for Goggins
    },
    
    // Speech recognition state
    recognition: null,
    isListening: false,
    
    // Audio cache to avoid regenerating the same messages
    audioCache: new Map(), // Maps text to audio URLs
    
    // Initialize voice chat functionality
    init: function() {
        console.log("Initializing voice chat");
        // Load settings from localStorage
        this.loadSettings();
        
        // Initialize speech recognition if available in the browser
        if (this.settings.speechRecognitionEnabled) {
            this.initSpeechRecognition();
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
    
    // Convert text to speech using OpenAI API
    textToSpeech: async function(text) {
        console.log("Converting text to speech:", text.substring(0, 30) + "...");
        
        // Check if we have this audio cached
        if (this.audioCache.has(text)) {
            console.log("Using cached audio for text");
            return this.audioCache.get(text);
        }
        
        if (!this.settings.enabled) {
            console.log("Voice is disabled, skipping TTS");
            return null;
        }
        
        try {
            console.log(`Sending TTS request: voice=${this.settings.voice}, speed=${this.settings.speed}`);
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    voice: this.settings.voice,
                    speed: this.settings.speed
                })
            });

            if (!response.ok) {
                console.error(`TTS API error: ${response.status}`);
                throw new Error(`TTS API error: ${response.status}`);
            }
            
            // Get blob from response
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log("Created audio URL:", audioUrl);
            
            // Cache the audio URL
            this.audioCache.set(text, audioUrl);
            
            return audioUrl;
        } catch (error) {
            console.error('Error generating speech:', error);
            return null;
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
                this.settings.voice = voiceSelect.value;
                console.log("Voice type changed to:", this.settings.voice);
                this.saveSettings();
            });
        } else {
            console.error("Voice select not found");
        }
        
        console.log("Voice event listeners setup complete");
    }
};