// DOM Elements
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const aiAvatar = document.getElementById('ai-avatar');
const moodText = document.getElementById('mood-text');
const avatarMainContainer = document.querySelector('.avatar-main-container');
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

// Default settings
const defaultSettings = {
    name: 'Goggins Bot',
    primaryColor: '#1a1a1a',
    showTimestamps: false,
    darkMode: true,
    intensity: 'challenging',
    apiKey: process.env.OPENAI_API_KEY || '' // Read from environment if available
};

// Chatbot State
const chatbotState = {
    mood: 'challenging', // Default mood: challenging, reflective, drill
    lastResponseTime: Date.now(),
    messages: [], // Store chat history
    settings: { ...defaultSettings }, // Clone default settings
    conversation: [] // Store the OpenAI conversation history
};

// Avatar Images
const avatars = {
    challenging: 'assets/challenging.png',
    reflective: 'assets/reflective.png',
    drill: 'assets/drill.png'
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
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();

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

// Function to save messages to localStorage
function saveMessageHistory() {
    localStorage.setItem('gogginsChatHistory', JSON.stringify(chatbotState.messages));
    localStorage.setItem('gogginsConversation', JSON.stringify(chatbotState.conversation));
}

// Function to load messages from localStorage
function loadMessageHistory() {
    const savedMessages = localStorage.getItem('gogginsChatHistory');
    const savedConversation = localStorage.getItem('gogginsConversation');
    
    if (savedMessages) {
        chatbotState.messages = JSON.parse(savedMessages);
        chatBox.innerHTML = '';
        
        // Add welcome message if there are no saved messages
        if (chatbotState.messages.length === 0) {
            addWelcomeMessage();
        } else {
            // Display all saved messages
            chatbotState.messages.forEach(msg => {
                displaySavedMessage(msg);
            });
        }
    } else {
        addWelcomeMessage();
    }
    
    if (savedConversation) {
        chatbotState.conversation = JSON.parse(savedConversation);
    }
}

// Function to add welcome message
function addWelcomeMessage() {
    const welcomeMessage = {
        text: "What's up? Ready to put in the work today? I'm here to push you beyond your limits. Remember: It's not about motivation, it's about dedication and discipline.",
        isUser: false,
        mood: 'challenging',
        timestamp: Date.now()
    };
    chatbotState.messages.push(welcomeMessage);
    saveMessageHistory();
    displaySavedMessage(welcomeMessage);
}

// Function to display a saved message
function displaySavedMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = message.isUser ? 'user-message' : 'ai-message';
    
    if (!message.isUser) {
        // Add avatar for AI messages
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-small';
        
        const avatarImg = document.createElement('img');
        avatarImg.src = avatars[message.mood || 'challenging']; // Fallback to challenging if no mood
        avatarImg.alt = 'AI';
        
        avatarDiv.appendChild(avatarImg);
        messageDiv.appendChild(avatarDiv);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = message.text;
    
    contentDiv.appendChild(paragraph);
    messageDiv.appendChild(contentDiv);
    
    // Add timestamp
    addTimestampToMessage(messageDiv, message.timestamp);
    
    chatBox.appendChild(messageDiv);
    
    // Scroll to bottom of chat
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to add timestamp to messages
function addTimestampToMessage(messageDiv, timestamp) {
    const timestampDiv = document.createElement('div');
    timestampDiv.className = 'message-timestamp';
    timestampDiv.textContent = new Date(timestamp).toLocaleTimeString();
    timestampDiv.style.display = chatbotState.settings.showTimestamps ? 'block' : 'none';
    messageDiv.appendChild(timestampDiv);
}

// Function to show typing indicator
function showTypingIndicator() {
    const indicatorDiv = document.createElement('div');
    indicatorDiv.className = 'ai-message';
    indicatorDiv.id = 'typing-indicator';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar-small';
    
    const avatarImg = document.createElement('img');
    avatarImg.src = avatars[chatbotState.mood];
    avatarImg.alt = 'AI';
    
    avatarDiv.appendChild(avatarImg);
    indicatorDiv.appendChild(avatarDiv);
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('span');
        typingDiv.appendChild(dot);
    }
    
    indicatorDiv.appendChild(typingDiv);
    chatBox.appendChild(indicatorDiv);
    
    // Scroll to bottom of chat
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        chatBox.removeChild(indicator);
    }
}

// Function to add a message to the chat box
function addMessage(text, isUser = false) {
    // Create message object
    const messageObj = {
        text: text,
        isUser: isUser,
        mood: chatbotState.mood,
        timestamp: Date.now()
    };
    
    // Add to message history
    chatbotState.messages.push(messageObj);
    
    // Save to localStorage
    saveMessageHistory();
    
    // Display the message
    const messageDiv = document.createElement('div');
    messageDiv.className = isUser ? 'user-message' : 'ai-message';
    
    if (!isUser) {
        // Add avatar for AI messages
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-small';
        
        const avatarImg = document.createElement('img');
        avatarImg.src = avatars[chatbotState.mood];
        avatarImg.alt = 'AI';
        
        avatarDiv.appendChild(avatarImg);
        messageDiv.appendChild(avatarDiv);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    
    contentDiv.appendChild(paragraph);
    messageDiv.appendChild(contentDiv);
    
    // Add timestamp
    addTimestampToMessage(messageDiv, messageObj.timestamp);
    
    chatBox.appendChild(messageDiv);
    
    // Scroll to bottom of chat
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Function to clear chat history
function clearChatHistory() {
    chatbotState.messages = [];
    chatbotState.conversation = [];
    localStorage.removeItem('gogginsChatHistory');
    localStorage.removeItem('gogginsConversation');
    chatBox.innerHTML = '';
    
    // Add welcome message back
    addWelcomeMessage();
    
    // Reset mood to challenging
    chatbotState.mood = 'challenging';
    updateMoodDisplay('challenging');
}

// Function to save settings
function saveSettings() {
    localStorage.setItem('gogginsSettings', JSON.stringify(chatbotState.settings));
}

// Function to load settings
function loadSettings() {
    const savedSettings = localStorage.getItem('gogginsSettings');
    if (savedSettings) {
        chatbotState.settings = JSON.parse(savedSettings);
    }
    applySettings();
}

function applySettings() {
    // Update chatbot name
    chatbotNameElement.textContent = chatbotState.settings.name;
    
    // Apply theme color
    document.documentElement.style.setProperty('--primary-color', chatbotState.settings.primaryColor);
    document.documentElement.style.setProperty('--primary-hover', adjustColor(chatbotState.settings.primaryColor, 20));
    
    // Update form elements with current settings
    chatbotNameInput.value = chatbotState.settings.name;
    showTimestampsToggle.checked = chatbotState.settings.showTimestamps;
    darkModeToggle.checked = chatbotState.settings.darkMode;
    intensitySelect.value = chatbotState.settings.intensity;
    
    // Update color option selection
    colorOptions.forEach(option => {
        if (option.dataset.color === chatbotState.settings.primaryColor) {
            option.classList.add('active');
        } else {
            option.classList.remove('active');
        }
    });
    
    // Apply dark mode if needed
    if (chatbotState.settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Apply timestamps if needed
    updateTimestampDisplay();
    
    // Update mood display based on intensity
    updateMoodDisplay(chatbotState.settings.intensity);
}

// Function to adjust a hex color (lighten/darken)
function adjustColor(hex, percent) {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    
    // Adjust color by percentage
    r = Math.max(0, Math.min(255, r + percent));
    g = Math.max(0, Math.min(255, g + percent));
    b = Math.max(0, Math.min(255, b + percent));
    
    // Convert back to hex
    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');
    
    return `#${r}${g}${b}`;
}

// Function to update timestamp display based on settings
function updateTimestampDisplay() {
    const timestamps = document.querySelectorAll('.message-timestamp');
    if (chatbotState.settings.showTimestamps) {
        timestamps.forEach(ts => ts.style.display = 'block');
    } else {
        timestamps.forEach(ts => ts.style.display = 'none');
    }
}

// Function to update the mood display
function updateMoodDisplay(mood) {
    console.log(`Updating mood display to: ${mood}`);
    
    // Validate mood
    if (!['challenging', 'reflective', 'drill'].includes(mood)) {
        console.error(`Invalid mood: ${mood}, defaulting to challenging`);
        mood = 'challenging';
    }
    
    // Update chatbot state
    chatbotState.mood = mood;
    
    // Update the avatar image with full path validation
    const avatarPath = avatars[mood];
    if (!avatarPath) {
        console.error(`No avatar path for mood: ${mood}`);
    } else {
        console.log(`Setting avatar to: ${avatarPath}`);
        aiAvatar.src = avatarPath;
    }
    
    // Update mood text with error handling
    try {
        const phrases = moodPhrases[mood];
        if (phrases && phrases.length > 0) {
            const randomIndex = Math.floor(Math.random() * phrases.length);
            moodText.textContent = phrases[randomIndex];
        } else {
            console.error(`No mood phrases for: ${mood}`);
            moodText.textContent = mood.charAt(0).toUpperCase() + mood.slice(1);
        }
    } catch (error) {
        console.error("Error updating mood text:", error);
        moodText.textContent = mood;
    }
    
    // Update container class for styling
    avatarMainContainer.classList.remove('mood-challenging', 'mood-reflective', 'mood-drill');
    avatarMainContainer.classList.add(`mood-${mood}`);
}

// Function to handle sending a message
async function sendMessage() {
    const message = userInput.value.trim();
    
    if (message === '') return;
    
    // Check for special commands
    if (message.toLowerCase() === '/clear') {
        clearChatHistory();
        userInput.value = '';
        return;
    }
    
    // Add user message to chat
    addMessage(message, true);
    
    // Clear input field
    userInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Get AI response with a slight delay for typing effect
    setTimeout(async () => {
        try {
            // Remove typing indicator
            removeTypingIndicator();
            
            // Get response from OpenAI
            const response = await getOpenAIResponse(message);
            
            // Add AI response to chat
            addMessage(response, false);
            
        } catch (error) {
            console.error("Error getting AI response:", error);
            
            // Remove typing indicator
            removeTypingIndicator();
            
            // Fallback to error message
            addMessage("I need a valid OpenAI API key to respond. Please check your settings.", false);
        }
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
}

// Color option selection
function handleColorOptionClick(e) {
    // Remove active class from all options
    colorOptions.forEach(option => option.classList.remove('active'));
    
    // Add active class to clicked option
    e.target.classList.add('active');
}

// Settings Panel Functions
function openSettingsPanel() {
    settingsPanel.classList.add('active');
    settingsOverlay.classList.add('active');
}

function closeSettingsPanel() {
    settingsPanel.classList.remove('active');
    settingsOverlay.classList.remove('active');
}

function saveSettingsChanges() {
    // Get values from form elements
    chatbotState.settings.name = chatbotNameInput.value;
    chatbotState.settings.showTimestamps = showTimestampsToggle.checked;
    chatbotState.settings.darkMode = darkModeToggle.checked;
    chatbotState.settings.intensity = intensitySelect.value;
    
    // Get selected color
    const activeColor = document.querySelector('.color-option.active');
    if (activeColor) {
        chatbotState.settings.primaryColor = activeColor.dataset.color;
    }
    
    // Save settings to localStorage
    saveSettings();
    
    // Apply settings to UI
    applySettings();
    
    // Close panel
    closeSettingsPanel();
}

function resetSettingsToDefault() {
    chatbotState.settings = { ...defaultSettings };
    saveSettings();
    applySettings();
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Settings panel events
settingsBtn.addEventListener('click', openSettingsPanel);
closeSettingsBtn.addEventListener('click', closeSettingsPanel);
settingsOverlay.addEventListener('click', closeSettingsPanel);
saveSettingsBtn.addEventListener('click', saveSettingsChanges);
resetSettingsBtn.addEventListener('click', resetSettingsToDefault);

// Color option selection
colorOptions.forEach(option => {
    option.addEventListener('click', handleColorOptionClick);
});

// Clear chat history
clearBtn.addEventListener('click', clearChatHistory);

// Try to load API key from environment
function loadApiKey() {
    fetch('/api-key')
        .then(response => response.json())
        .then(data => {
            if (data && data.key) {
                chatbotState.settings.apiKey = data.key;
                saveSettings();
                console.log("API key loaded successfully");
            } else {
                console.error("No API key found");
            }
        })
        .catch(error => {
            console.error("Error loading API key:", error);
        });
}

// Initialize - load message history, settings, and update UI
window.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadMessageHistory();
    
    // Set dark mode by default for Goggins Bot
    if (!localStorage.getItem('gogginsSettings')) {
        document.body.classList.add('dark-mode');
    }
    
    userInput.focus();
    
    // Try to load API key from environment
    loadApiKey();
});