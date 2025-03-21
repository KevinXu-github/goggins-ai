// Function to get response from OpenAI API
async function getOpenAIResponse(message, systemPrompt) {
    try {
        console.log("Getting OpenAI response for:", message);
        
        // Check for API key
        const apiKey = process.env.OPENAI_API_KEY || '';
        
        if (!apiKey) {
            console.error("No API key available");
            return "I need an OpenAI API key to respond. Please check your .env file.";
        }
        
        // If no system prompt was provided, use default
        if (!systemPrompt) {
            systemPrompt = "You are David Goggins, a former Navy SEAL, ultramarathon runner, and motivational speaker known for mental toughness and pushing beyond limits. Respond as David Goggins would, using his direct, no-excuses style and occasional profanity. Focus on mental toughness, accountability, and pushing beyond comfort zones.";
        }
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.8,
                max_tokens: 256
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`API Error: ${response.status}`, errorData);
            return "Error connecting to OpenAI. Please try again later.";
        }
        
        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();
        
        console.log("Received OpenAI response:", responseText);
        
        return responseText;
    } catch (error) {
        console.error("Error getting OpenAI response:", error);
        return "Something went wrong with the OpenAI API. Please check your connection and API key.";
    }
}

// For Node.js < 18, you might need to uncomment this
// const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = { getOpenAIResponse };