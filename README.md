# Goggins Motivational Chatbot

A voice-enabled motivational chatbot built to deliver David Goggins-style motivation. The bot responds with the direct, no-excuses approach that has made Goggins famous, and even speaks using a custom voice model trained on his distinctive speech patterns.

## What This Project Does

This chatbot delivers the mental toughness philosophy of David Goggins through both text and voice. Whether you need motivation for a tough workout, a challenging project, or just to build mental resilience, this bot provides the unfiltered motivation that Goggins is known for.

Unlike generic motivational tools, this one specifically embodies Goggins' approach to discomfort, accountability, and pushing beyond perceived limits. The integration of voice technology makes the experience more impactful, allowing users to not only read but hear responses in a voice that closely resembles Goggins' distinctive tone.

## Key Features

- **Multiple Intensity Modes** that let you choose how hard you want to be pushed:
  - **Challenging Mode**: Motivational but balanced, pushing you while providing support
  - **Reflective Mode**: Draws on Goggins' life lessons and personal insights
  - **Drill Sergeant Mode**: Maximum intensity for when you need the hardest push

- **Voice Response System** using a custom-trained model on Goggins' speech patterns

- **Dark Mode Interface** designed to match the intensity of the content

- **Conversation Memory** that builds context over time

- **Fully Customizable** settings for colors, voice options, and user preferences

## Technology Stack

The chatbot is built using:

- **Node.js with Express** for the backend server
- **Vanilla JavaScript** for the frontend logic
- **Tortoise TTS** for high-quality voice synthesis
- **OpenAI API** for contextual response generation
- **PyTorch** powering the voice model training

## Getting Started

### Requirements

- Node.js (v14+)
- npm or yarn
- Python 3.8+ with pip
- PyTorch 1.12+
- 4GB+ RAM (8GB recommended for voice generation)
- CUDA-compatible GPU recommended for faster voice generation

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/goggins-motivational-chatbot.git
   cd goggins-motivational-chatbot
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   ```bash
   # Create .env file with your OpenAI API key
   echo "OPENAI_API_KEY=your_key_here" > .env
   echo "PORT=3000" >> .env
   ```

4. Install Python dependencies:
   ```bash
   pip install TorToiSe-TTS torch torchaudio pydub soundfile
   ```

5. Create necessary directories:
   ```bash
   mkdir -p assets voice_samples output
   ```

6. Start the application:
   ```bash
   npm start
   ```

7. Open your browser to http://localhost:3000

## Improving the Voice Model

For better voice quality, you can add more training samples:

1. Collect audio clips of Goggins speaking (ideally 10-30 seconds each)
2. Save them in the `assets` folder
3. Run the voice training script:
   ```bash
   python clone_voice.py --input_dir=assets --output_dir=voice_samples
   ```

The more quality samples you provide, the more authentic the voice will sound.

## How to Use

1. **Send a message** by typing in the input field and hitting enter
2. **Get a response** in both text and optional voice format
3. **Adjust intensity** through the settings panel if you want more or less push
4. **Toggle voice** on or off depending on your preference
5. **Customize the interface** through the settings panel

## Project Structure

```
goggins-motivational-chatbot/
├── server.js               # Express server handling API requests
├── app.js                  # Main application logic
├── voice-chat.js           # Voice synthesis and playback
├── index.html              # Main interface
├── styles.css              # CSS styling
├── clone_voice.py          # Script for training the voice model
├── generate_speech.py      # Script for generating speech
├── openai.js               # OpenAI API integration
├── package.json            # Dependencies
├── .env                    # Environment variables
├── assets/                 # Original voice samples
├── voice_samples/          # Processed voice samples
├── output/                 # Generated speech files
└── README.md               # Documentation
```

## Motivation Philosophy

The chatbot's responses are based on Goggins' core principles:

- **Mental Toughness**: Building resilience through deliberate discomfort
- **The 40% Rule**: The idea that when your mind wants to quit, you're only at 40% of your capacity
- **Accountability**: Taking complete ownership of your circumstances and results
- **Cookie Jar Method**: Drawing on past achievements for confidence in difficult moments
- **Continuous Improvement**: Never settling, always pushing boundaries

## Potential Uses

- Workout motivation
- Overcoming procrastination
- Breaking through mental barriers
- Building consistent habits
- Personal development
- Professional challenges

## Contributing

Contributions are welcome. Areas where help would be particularly valuable:

- Improving the voice model training
- Enhancing the response quality
- Adding new features
- Fixing bugs
- Improving documentation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- David Goggins for the inspiration
- The team behind Tortoise TTS
- OpenAI for their language models
- The open source community for various components

---

"Stay Hard"
