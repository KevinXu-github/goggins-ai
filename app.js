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
    voiceType: 'tortoise_goggins',
    voiceSpeed: 1.1
};

// Chatbot State
const chatbotState = {
    mood: 'challenging', // Default mood: challenging, reflective, drill
    lastResponseTime: Date.now(),
    messages: [], // Store chat history
    settings: { ...defaultSettings }, // Clone default settings
    conversation: [] // Store the OpenAI conversation history
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

// OpenAI API Integration
async function getOpenAIResponse(message) {
    try {
        console.log("Getting OpenAI response for message:", message);
        
        // Check for API key
        if (!chatbotState.settings.apiKey) {
            throw new Error("No API key available");
        }

        // Create system message based on intensity
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
                max_tokens: 256
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

// Create OpenAI system prompt based on intensity
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
    
    // Color theme selection with improved handling
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            console.log("Color option clicked:", color);
            setActiveColor(color);
            
            // Apply immediately to give visual feedback
            document.documentElement.style.setProperty('--primary-color', color);
            document.documentElement.style.setProperty('--primary-hover', adjustColorBrightness(color, 20));
            document.documentElement.style.setProperty('--primary-light', adjustColorBrightness(color, 30));
        });
    });
    
    // Initialize active color on startup
    const initialColor = chatbotState.settings.primaryColor || '#1a1a1a';
    setActiveColor(initialColor);
    
    console.log("Event listeners initialized with color support");
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
        addMessageToChat('ai', response);
        
        // Generate and play voice if enabled
        if (voiceChat && voiceChat.settings.enabled) {
            const audioUrl = await voiceChat.textToSpeech(response);
            if (audioUrl) {
                voiceChat.playAudio(audioUrl);
            }
        }
    } catch (error) {
        console.error("Error getting response:", error);
        hideTypingIndicator();
        addMessageToChat('ai', "Sorry, I couldn't process your request. Please make sure your API key is set up correctly.");
    }
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

// Enhanced setActiveColor function with better brightness calculation
function setActiveColor(color) {
    console.log("Setting active color:", color);
    
    // Set CSS custom properties
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
    
    console.log("Color updated successfully");
}

// Improved color brightness adjustment function
function adjustColorBrightness(hex, percent) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert hex to rgb
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);
    
    // Adjust brightness
    r = Math.min(255, Math.max(0, r + percent));
    g = Math.min(255, Math.max(0, g + percent));
    b = Math.min(255, Math.max(0, b + percent));
    
    // Convert back to hex
    const toHex = (c) => {
        const hex = c.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Enhanced loadSettings function to properly apply colors
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
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            // Set active color and apply immediately
            if (chatbotState.settings.primaryColor) {
                setActiveColor(chatbotState.settings.primaryColor);
            }
            
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

// Enhanced saveSettings function
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
    
    // Reapply color theme
    if (chatbotState.settings.primaryColor) {
        setActiveColor(chatbotState.settings.primaryColor);
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

// Debug function to test color changes
function debugColorChange() {
    console.log("Available colors:");
    colorOptions.forEach((option, index) => {
        const color = option.getAttribute('data-color');
        console.log(`${index}: ${color}`);
    });
    
    console.log("Current primary color:", getComputedStyle(document.documentElement).getPropertyValue('--primary-color'));
}