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
    },
    
    // Load voice settings from localStorage
    loadSettings: function() {
        const savedSettings = localStorage.getItem('gogginsVoiceSettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                this.settings = { ...this.settings, ...parsed };
            } catch (e) {
                console.error('Error parsing voice settings:', e);
            }
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
            
            return true;
        } catch (e) {
            console.error('Error initializing speech recognition:', e);
            return false;
        }
    },
    
    // Start listening for speech input
    startListening: function() {
        if (!this.recognition && !this.initSpeechRecognition()) {
            return;
        }
        
        try {
            this.recognition.start();
            this.isListening = true;
            
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
            } catch (e) {
                // Ignore errors when stopping recognition
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
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    },
    
    // Convert text to speech using OpenAI API
    textToSpeech: async function(text) {
        // Check if we have this audio cached
        if (this.audioCache.has(text)) {
            return this.audioCache.get(text);
        }
        
        try {
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
                throw new Error(`TTS API error: ${response.status}`);
            }
            
            // Get blob from response
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
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
        if (!audioUrl) return;
        
        const audioPlayer = document.getElementById('audio-player');
        if (audioPlayer) {
            audioPlayer.src = audioUrl;
            audioPlayer.play();
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
                    url = await this.textToSpeech(text);
                }
                
                // Play the audio
                if (url) {
                    this.playAudio(url);
                    // Update button state
                    playButton.innerHTML = '<i class="fas fa-play"></i> Play';
                } else {
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
        // Mic button for speech recognition
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) {
            micBtn.addEventListener('click', () => this.toggleListening());
        }
        
        // Voice toggle button
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            // Set initial state
            if (this.settings.enabled) {
                voiceBtn.classList.add('active');
            }
            
            voiceBtn.addEventListener('click', () => {
                voiceBtn.classList.toggle('active');
                this.settings.enabled = voiceBtn.classList.contains('active');
                this.saveSettings();
            });
        }
        
        // Settings panel voice toggles
        const voiceToggle = document.getElementById('voice-output');
        if (voiceToggle) {
            voiceToggle.checked = this.settings.enabled;
            voiceToggle.addEventListener('change', () => {
                this.settings.enabled = voiceToggle.checked;
                
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
        }
        
        // Speech recognition toggle
        const speechToggle = document.getElementById('speech-input');
        if (speechToggle) {
            speechToggle.checked = this.settings.speechRecognitionEnabled;
            speechToggle.addEventListener('change', () => {
                this.settings.speechRecognitionEnabled = speechToggle.checked;
                
                if (this.settings.speechRecognitionEnabled && !this.recognition) {
                    this.initSpeechRecognition();
                }
                
                this.saveSettings();
            });
        }
        
        // Voice type selection
        const voiceSelect = document.getElementById('voice-select');
        if (voiceSelect) {
            voiceSelect.value = this.settings.voice;
            voiceSelect.addEventListener('change', () => {
                this.settings.voice = voiceSelect.value;
                this.saveSettings();
            });
        }
    }
};