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