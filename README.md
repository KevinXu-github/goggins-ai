# Goggins Motivational Chatbot

A motivational chatbot inspired by David Goggins that responds with Goggins' signature tough love style.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm
- OpenAI API key

### Installation

1. Clone this repository or download the files

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with your OpenAI API key:
```
OPENAI_API_KEY=your_api_key_here
```

4. Create an `assets` folder with avatar images for different intensities:
   - `challenging.png` - Default intensity
   - `reflective.png` - More thoughtful mood
   - `drill.png` - Drill sergeant intensity

### Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Features

- **David Goggins Personality**: The chatbot responds in David Goggins' motivational style
- **Intensity Levels**: Choose between different Goggins personas:
  - **Challenging**: Direct, intense motivation with supportive elements
  - **Reflective**: Sharing life lessons and personal stories
  - **Drill Sergeant**: Extremely tough, no-excuses approach
- **Dark Mode**: Default dark theme reflecting Goggins' intense style
- **Customizable UI**: Change colors, name, and other settings

## Usage

- Type messages in the chat input and press Enter or click the send button
- Use the settings gear icon to customize the chatbot's appearance and behavior
- Change the intensity level to experience different aspects of Goggins' personality

## Privacy

The application uses your OpenAI API key to generate responses but keeps all data local to your browser. Your conversations and settings are stored in your browser's localStorage and are not sent to any external servers other than OpenAI for generating responses.

## Stay Hard!