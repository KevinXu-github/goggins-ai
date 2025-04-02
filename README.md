# Goggins Motivational Chatbot

A motivational chatbot inspired by David Goggins that responds with Goggins' signature tough love style and speaks using a custom voice clone.

## Features

- **David Goggins Personality**: The chatbot responds in David Goggins' motivational style with concise, impactful messages
- **Custom Voice Clone**: Speaks responses using a Tortoise TTS voice model trained on David Goggins' voice
- **Intensity Levels**: Choose between different Goggins personas:
  - **Challenging**: Direct, intense motivation with supportive elements
  - **Reflective**: Sharing life lessons and personal stories
  - **Drill Sergeant**: Extremely tough, no-excuses approach
- **Real-time Status Updates**: Visual indicators show the voice generation process
- **Dark Mode**: Default dark theme reflecting Goggins' intense style
- **Customizable UI**: Change colors, name, and other settings

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm
- Python 3.x with PyTorch and Tortoise TTS installed
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

4. Make sure you have the required Python libraries installed:
```bash
pip install TorToiSe-TTS torch torchaudio pydub soundfile
```

5. Create a directory structure:
```
assets/               # For original voice sample
voice_samples/        # For processed voice samples
output/               # For generated speech files
```

### Running the Application

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

## Voice Clone Integration

The chatbot uses Tortoise TTS to clone David Goggins' voice:

1. Voice samples are stored in the `voice_samples/` directory
2. When the chatbot generates a response, it automatically:
   - Sends the text to the server
   - Runs the Python voice generation script
   - Shows status updates throughout the process
   - Plays the generated voice when ready

### Voice Status Indicators

- **Generating Goggins voice...**: The Python script is running
- **Voice generated**: The audio file is ready
- **Playing Goggins voice**: Audio is currently playing
- **Complete**: Audio playback has finished

## Usage

- Type messages in the chat input and press Enter or click the send button
- Use the settings gear icon to customize the chatbot's appearance and behavior
- Change the intensity level to experience different aspects of Goggins' personality
- Voice responses are generated automatically when the chatbot responds

## Project Structure

- `app.js`: Main chatbot logic and UI interactions
- `server.js`: Express server with endpoints for OpenAI and voice generation
- `voice-chat.js`: Handles voice playback and settings
- `generate_speech.py`: Python script for Tortoise TTS voice generation
- `clone_voice.py`: Script used to create initial voice samples
- `styles.css`: Styling for the chatbot UI

## Customization

- **Voice Settings**: Toggle voice on/off, change voice type
- **Appearance**: Change theme color, toggle dark mode
- **Chatbot Behavior**: Adjust intensity level for different response styles
- **Timestamps**: Option to show message timestamps

## Credits

- Voice cloning powered by [Tortoise TTS](https://github.com/neonbjb/tortoise-tts)
- UI components using [Font Awesome](https://fontawesome.com/) icons
- OpenAI API for text generation

## Stay Hard!