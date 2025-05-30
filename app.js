// DOM Elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const moodText = document.getElementById('mood-text');
const chatbotNameElement = document.getElementById('chatbot-name');
const clearBtn = document.getElementById('clear-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const settingsOverlay = document.getElementById('settings-overlay');
const closeSettingsBtn = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings');
const resetSettingsBtn = document.getElementById('reset-settings');
const chatbotNameInput = document.getElementById('chatbot-name-input');
const showTimestampsToggle = document.getElementById('show-timestamps');
const darkModeToggle = document.getElementById('dark-mode');
const intensitySelect = document.getElementById('intensity-select');
const colorOptions = document.querySelectorAll('.color-option');
const voiceToggle = document.getElementById('voice-output');
const speechToggle = document.getElementById('speech-input');
const voiceSelect = document.getElementById('voice-select');
const micBtn = document.getElementById('mic-btn');
const voiceBtn = document.getElementById('voice-btn');
const audioPlayer = document.getElementById('audio-player');

// Default settings
const defaultSettings = {
    name: 'Goggins Bot',
    primaryColor: '#1a1a1a',
    showTimestamps: false,
    darkMode: true,
    intensity: 'challenging',
    apiKey: '', // Will be loaded from server
    voiceEnabled: true,
    speechInputEnabled: false,
    voiceType: 'onyx',
    voiceSpeed: 1.1
};

// Chatbot State
const chatbotState = {
    mood: 'challenging', // Default mood: challenging, reflective, drill
    lastResponseTime: Date.now(),
    messages: [], // Store chat history
    settings: { ...defaultSettings }, // Clone default settings
    conversation: [], // Store the OpenAI conversation history
    voiceGenerating: false, // Track voice generation status
    lastMessageElement: null // Track the last message element for status updates
};

// Mood Text
const moodPhrases = {
    challenging: [
        "Ready to push your limits",
        "Stay hard, stay hungry",
        "Embrace the suck today",
        "Time to callus your mind",
        "No excuses, take action",
        "Pain is your friend",
        "Push through your barriers",
        "Comfort is your enemy",
        "Rise above the weakness",
        "Outwork everyone today"
    ],
    reflective: [
        "Looking back to move forward",
        "Learn from every challenge",
        "Analyzing your journey",
        "Growth comes from struggle",
        "Finding strength in pain",
        "Building mental fortitude",
        "Remember why you started",
        "Your worst enemy is you",
        "Silence the doubters",
        "Excellence is a habit"
    ],
    drill: [
        "NO EXCUSES ALLOWED!",
        "WHAT ARE YOU WAITING FOR?",
        "GET AFTER IT NOW!",
        "BREAK THROUGH THAT WALL!",
        "ARE YOU GIVING 100%?",
        "PAIN IS JUST WEAKNESS LEAVING!",
        "PUSH HARDER THAN YESTERDAY!",
        "STOP BEING SOFT!",
        "TAKE YOUR SOUL BACK!",
        "YOU'RE CAPABLE OF MORE!"
    ]
};

// OpenAI API Integration with concise response setting
async function getOpenAIResponse(message) {
    try {
        console.log("Getting OpenAI response for message:", message);
        
        // Check for API key
        if (!chatbotState.settings.apiKey) {
            throw new Error("No API key available");
        }

        // Create system message based on intensity with added brevity instructions
        const systemMessage = createSystemPrompt(chatbotState.settings.intensity);

        // Clone the conversation history to avoid mutation
        const conversation = [...chatbotState.conversation];

        // Add user message to conversation
        conversation.push({
            role: "user",
            content: message
        });

        console.log("Sending request to OpenAI...");
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${chatbotState.settings.apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo", // You can change to other models like "gpt-4" if you have access
                messages: [
                    { role: "system", content: systemMessage },
                    ...conversation
                ],
                temperature: 0.7,
                max_tokens: 150, // Reduced from 256 to force shorter responses
                presence_penalty: 0.6, // Added to discourage repetitive responses
                frequency_penalty: 0.5 // Added to encourage diverse vocabulary
            })
        });

        if (!response.ok) {
            console.error("API response not OK:", response.status);
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();
        console.log("Received response:", responseText);

        // Add response to conversation history
        chatbotState.conversation.push({ role: "user", content: message });
        chatbotState.conversation.push({ role: "assistant", content: responseText });

        // Limit conversation length to prevent excessive token usage
        if (chatbotState.conversation.length > 20) {
            // Remove oldest messages while keeping system prompt
            chatbotState.conversation = chatbotState.conversation.slice(-20);
        }

        return responseText;
    } catch (error) {
        console.error("Error with OpenAI:", error);
        return "I can't provide a response right now. Please make sure you've set up your OpenAI API key correctly.";
    }
}

// Create OpenAI system prompt based on intensity with brevity instructions
function createSystemPrompt(intensity) {
    let basePrompt = "You are David Goggins, a former Navy SEAL, ultramarathon runner, and motivational speaker known for mental toughness and pushing beyond limits. Respond as David Goggins would, using his direct, no-excuses style and occasional profanity. KEEP YOUR RESPONSES SHORT AND IMPACTFUL - NO MORE THAN 2-3 SENTENCES MAXIMUM. Be direct, blunt, and get straight to the point.";
    
    switch (intensity) {
        case 'challenging':
            return basePrompt + " Be challenging but supportive, focusing on pushing people beyond their perceived limits. Use short, powerful phrases like 'stay hard', 'embrace the suck', and 'callus your mind'. Short, direct statements have more impact than lengthy explanations.";
        
        case 'reflective':
            return basePrompt + " Be reflective but concise. Reference your personal transformation in just 1-2 short sentences. Don't over-explain. Connect these briefly to the person's challenges with direct, impactful statements.";
        
        case 'drill':
            return basePrompt + " Act like a drill instructor - be loud (USE CAPS), intense, and in-your-face. Challenge excuses immediately. Be extremely direct and forceful. Call out weakness and demand action. Use very short, powerful sentences. NO EXPLANATIONS.";
        
        default:
            return basePrompt + " Focus on mental toughness, accountability, and pushing beyond comfort zones. Always be brief and impactful.";
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize voice chat features
    if (typeof voiceChat !== 'undefined') {
        voiceChat.init();
        voiceChat.setupEventListeners();
    }
    
    // Load settings from localStorage
    loadSettings();
    
    // Set a random mood phrase on startup
    updateMoodPhrase();
    
    // Get API key from server
    getAPIKey();
    
    // Set up event listeners for the chat functionality
    setupEventListeners();
    
    // Set up audio player event listeners
    setupAudioPlayerEvents();
});

// Set up main event listeners
function setupEventListeners() {
    // Send message on button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Send message on Enter key press
    userInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Clear chat history
    clearBtn.addEventListener('click', clearChat);
    
    // Settings panel open/close
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    settingsOverlay.addEventListener('click', closeSettings);
    
    // Save and reset settings
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Color theme selection
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            setActiveColor(color);
        });
    });
    
    // Initialize active color
    setActiveColor(chatbotState.settings.primaryColor);
    
    console.log("Event listeners initialized");
}

// Set up audio player event listeners
function setupAudioPlayerEvents() {
    audioPlayer.addEventListener('play', function() {
        console.log('Audio playback started');
        updateVoiceStatus('playing');
    });
    
    audioPlayer.addEventListener('ended', function() {
        console.log('Audio playback ended');
        updateVoiceStatus('complete');
    });
    
    audioPlayer.addEventListener('error', function() {
        console.error('Audio playback error');
        updateVoiceStatus('error');
    });
}

// Send a message to the chatbot
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (message === '') return;
    
    // Add user message to chat
    addMessageToChat('user', message);
    
    // Clear input field
    userInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Get response from OpenAI
        const response = await getOpenAIResponse(message);
        
        // Remove typing indicator
        hideTypingIndicator();
        
        // Add AI response to chat
        const messageElement = addMessageToChat('ai', response);
        
        // Store the message element for status updates
        chatbotState.lastMessageElement = messageElement;
        
        // Automatically generate and play voice if enabled
        if (chatbotState.settings.voiceEnabled) {
            generateAndPlayGogginsSpeech(response);
        }
    } catch (error) {
        console.error("Error getting response:", error);
        hideTypingIndicator();
        addMessageToChat('ai', "Sorry, I couldn't process your request. Please make sure your API key is set up correctly.");
    }
}

// Generate and play Goggins voice
async function generateAndPlayGogginsSpeech(text) {
    try {
        // Set voice generation status
        chatbotState.voiceGenerating = true;
        updateVoiceStatus('generating');
        
        // Create a unique filename based on timestamp
        const timestamp = Date.now();
        const outputFilename = `goggins_${timestamp}.wav`;
        
        // Call the server endpoint to generate speech
        const response = await fetch('/api/generate-speech', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                output: outputFilename
            })
        });
        
        if (!response.ok) {
            throw new Error("Failed to generate speech");
        }
        
        // Get the URL of the generated audio file
        const data = await response.json();
        const audioUrl = data.audioUrl;
        
        // Set voice generation status
        chatbotState.voiceGenerating = false;
        updateVoiceStatus('ready');
        
        // Play the audio
        const audioPlayer = document.getElementById('audio-player');
        audioPlayer.src = audioUrl;
        audioPlayer.play();
        
        return audioUrl;
    } catch (error) {
        console.error("Error generating speech:", error);
        chatbotState.voiceGenerating = false;
        updateVoiceStatus('error');
        return null;
    }
}

// Update voice status on message element
function updateVoiceStatus(status) {
    if (!chatbotState.lastMessageElement) return;
    
    // Remove any existing status elements
    const existingStatus = chatbotState.lastMessageElement.querySelector('.voice-status');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    // Create new status element
    const statusElement = document.createElement('div');
    statusElement.className = 'voice-status';
    
    // Set appropriate status message
    switch (status) {
        case 'generating':
            statusElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Goggins voice...';
            statusElement.classList.add('generating');
            break;
        case 'ready':
            statusElement.innerHTML = '<i class="fas fa-check"></i> Voice generated';
            statusElement.classList.add('ready');
            // Automatically fade out after 3 seconds
            setTimeout(() => {
                statusElement.classList.add('fade-out');
            }, 3000);
            break;
        case 'playing':
            statusElement.innerHTML = '<i class="fas fa-volume-up"></i> Playing Goggins voice';
            statusElement.classList.add('playing');
            break;
        case 'complete':
            statusElement.innerHTML = '<i class="fas fa-check-circle"></i> Complete';
            statusElement.classList.add('complete');
            // Automatically fade out after 2 seconds
            setTimeout(() => {
                statusElement.classList.add('fade-out');
            }, 2000);
            break;
        case 'error':
            statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Voice generation failed';
            statusElement.classList.add('error');
            break;
    }
    
    // Add status element to message
    chatbotState.lastMessageElement.appendChild(statusElement);
}

// Add a message to the chat display
function addMessageToChat(sender, text, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = text;
    
    messageDiv.appendChild(messageContent);
    
    // Add timestamp if enabled
    if (chatbotState.settings.showTimestamps || timestamp) {
        const timeString = timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        timestampDiv.textContent = timeString;
        messageContent.appendChild(timestampDiv);
    }
    
    // Add play button for AI messages if voice is enabled
    if (sender === 'ai' && voiceChat && voiceChat.settings.enabled) {
        const playButton = voiceChat.createPlayButton(text);
        messageContent.appendChild(playButton);
        messageDiv.classList.add('has-audio');
    }
    
    // Add to chat
    chatBox.appendChild(messageDiv);
    
    // Save to history
    chatbotState.messages.push({
        sender: sender,
        text: text,
        timestamp: new Date().toISOString()
    });
    
    // Scroll to bottom
    chatBox.scrollTop = chatBox.scrollHeight;
    
    // Save chat history to localStorage
    saveChatHistory();
    
    // Return the message element for status updates
    return messageDiv;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'ai-message typing-indicator-container';
    typingDiv.id = 'typing-indicator';
    
    const typingContent = document.createElement('div');
    typingContent.className = 'typing-indicator';
    
    typingContent.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    
    typingDiv.appendChild(typingContent);
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Get API key from server
async function getAPIKey() {
    try {
        const response = await fetch('/api-key');
        if (!response.ok) {
            throw new Error('Failed to get API key');
        }
        
        const data = await response.json();
        if (data.key) {
            chatbotState.settings.apiKey = data.key;
            console.log("API key loaded successfully");
        } else {
            console.error("No API key received from server");
        }
    } catch (error) {
        console.error("Error getting API key:", error);
    }
}

// Update mood phrase
function updateMoodPhrase() {
    const mood = chatbotState.settings.intensity;
    const phrases = moodPhrases[mood] || moodPhrases.challenging;
    const randomIndex = Math.floor(Math.random() * phrases.length);
    const phrase = phrases[randomIndex];
    
    moodText.textContent = phrase;
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('gogginsSettings');
    if (savedSettings) {
        try {
            const parsed = JSON.parse(savedSettings);
            chatbotState.settings = { ...chatbotState.settings, ...parsed };
            
            // Apply settings to UI
            chatbotNameElement.textContent = chatbotState.settings.name;
            chatbotNameInput.value = chatbotState.settings.name;
            showTimestampsToggle.checked = chatbotState.settings.showTimestamps;
            darkModeToggle.checked = chatbotState.settings.darkMode;
            intensitySelect.value = chatbotState.settings.intensity;
            
            // Apply dark mode
            if (chatbotState.settings.darkMode) {
                document.body.classList.add('dark-mode');
            }
            
            // Set active color
            setActiveColor(chatbotState.settings.primaryColor);
            
            // Update mood based on intensity
            chatbotState.mood = chatbotState.settings.intensity;
            updateMoodPhrase();
            
            console.log("Settings loaded:", chatbotState.settings);
        } catch (e) {
            console.error("Error loading settings:", e);
        }
    }
    
    // Load chat history
    loadChatHistory();
}

// Save settings to localStorage
function saveSettings() {
    // Get values from UI
    chatbotState.settings.name = chatbotNameInput.value;
    chatbotState.settings.showTimestamps = showTimestampsToggle.checked;
    chatbotState.settings.darkMode = darkModeToggle.checked;
    chatbotState.settings.intensity = intensitySelect.value;
    
    // Save to localStorage
    localStorage.setItem('gogginsSettings', JSON.stringify(chatbotState.settings));
    
    // Apply settings
    chatbotNameElement.textContent = chatbotState.settings.name;
    
    if (chatbotState.settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Update mood based on intensity
    chatbotState.mood = chatbotState.settings.intensity;
    updateMoodPhrase();
    
    // Update conversation context for OpenAI
    chatbotState.conversation = [];
    
    console.log("Settings saved:", chatbotState.settings);
    
    // Close settings panel
    closeSettings();
}

// Reset settings to defaults
function resetSettings() {
    chatbotState.settings = { ...defaultSettings };
    
    // Update UI
    chatbotNameInput.value = defaultSettings.name;
    showTimestampsToggle.checked = defaultSettings.showTimestamps;
    darkModeToggle.checked = defaultSettings.darkMode;
    intensitySelect.value = defaultSettings.intensity;
    
    // Set active color
    setActiveColor(defaultSettings.primaryColor);
    
    console.log("Settings reset to defaults");
}

// Set active color theme
function setActiveColor(color) {
    document.documentElement.style.setProperty('--primary-color', color);
    document.documentElement.style.setProperty('--primary-hover', adjustColorBrightness(color, 20));
    document.documentElement.style.setProperty('--primary-light', adjustColorBrightness(color, 30));
    
    // Update active color in settings
    colorOptions.forEach(option => {
        if (option.getAttribute('data-color') === color) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Save the color to settings
    chatbotState.settings.primaryColor = color;
}

// Adjust color brightness (simple helper)
function adjustColorBrightness(hex, percent) {
    // Convert hex to rgb
    let r = parseInt(hex.substr(1, 2), 16);
    let g = parseInt(hex.substr(3, 2), 16);
    let b = parseInt(hex.substr(5, 2), 16);
    
    // Adjust brightness
    r = Math.min(255, r + percent);
    g = Math.min(255, g + percent);
    b = Math.min(255, b + percent);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Open settings panel
function openSettings() {
    settingsPanel.classList.add('active');
    settingsOverlay.classList.add('active');
}

// Close settings panel
function closeSettings() {
    settingsPanel.classList.remove('active');
    settingsOverlay.classList.remove('active');
}

// Clear chat history
function clearChat() {
    chatBox.innerHTML = '';
    chatbotState.messages = [];
    chatbotState.conversation = [];
    
    // Save empty chat history to localStorage
    saveChatHistory();
    
    console.log("Chat history cleared");
}

// Save chat history to localStorage
function saveChatHistory() {
    localStorage.setItem('gogginsChat', JSON.stringify(chatbotState.messages));
}

// Load chat history from localStorage
function loadChatHistory() {
    const savedChat = localStorage.getItem('gogginsChat');
    if (savedChat) {
        try {
            const messages = JSON.parse(savedChat);
            chatbotState.messages = messages;
            
            // Add messages to chat
            chatBox.innerHTML = '';
            messages.forEach(msg => {
                addMessageToChat(msg.sender, msg.text, new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            });
            
            console.log("Chat history loaded:", messages.length, "messages");
        } catch (e) {
            console.error("Error loading chat history:", e);
        }
    }
}