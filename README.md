# Goggins Motivational Chatbot

A motivational chatbot inspired by David Goggins that responds with Goggins' signature tough love style. Features user authentication, conversation history, voice synthesis, and database persistence.

## Features

### Core Features
- **David Goggins Personality**: The chatbot responds in David Goggins' motivational style with authentic tough love approach
- **User Authentication**: Secure login/registration system with session management
- **Conversation Management**: Create, switch between, and delete multiple conversations
- **Message History**: Persistent conversation storage with MongoDB
- **Search Functionality**: Search through your conversation history

### Intensity Levels
Choose between different Goggins personas:
- **Challenging**: Direct, intense motivation with supportive elements
- **Reflective**: Sharing life lessons and personal stories
- **Drill Sergeant**: Extremely tough, no-excuses approach

### Voice Features
- **Multiple Voice Options**: Choose from various OpenAI TTS voices
- **Custom Goggins Voice**: High-quality voice cloning using Tortoise-TTS
- **Speech Recognition**: Voice input support (optional)
- **Audio Caching**: Efficient audio storage and playback

### Customization
- **Theme Colors**: Multiple color schemes to personalize your experience
- **Dark Mode**: Default dark theme reflecting Goggins' intense style
- **Timestamps**: Optional message timestamps
- **Settings Persistence**: All preferences saved locally and in database

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm
- MongoDB (local or cloud instance)
- OpenAI API key
- Python 3.7+ (for Tortoise-TTS voice cloning - optional)

### Installation

1. **Clone this repository or download the files**

2. **Install Node.js dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_openai_api_key_here
MONGODB_URI=mongodb://localhost:27017/goggins-chatbot
SESSION_SECRET=your_secure_session_secret_here
PORT=3000
```

4. **Set up MongoDB:**
   - Install MongoDB locally or use MongoDB Atlas
   - The application will automatically create the database and collections
   - Run the demo user script (optional):
   ```bash
   node scripts/create-demo-user.js
   ```

5. **Set up Tortoise-TTS (Optional - for custom Goggins voice):**
   - Install Python dependencies:
   ```bash
   pip install torch tortoise-tts soundfile pydub
   ```
   - Place a David Goggins audio sample in the assets folder as `goggin_iso.mp3`
   - Run the voice cloning script to create voice samples:
   ```bash
   python clone_voice.py
   ```
   - This will create voice samples in the `voice_samples/` folder that Tortoise-TTS uses to generate speech

### Running the Application

1. **Start the server:**
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

2. **Open your browser and navigate to:**
```
http://localhost:3000
```

3. **Login Options:**
   - Create a new account using the registration form
   - Use demo account: username `demo`, password `demo123`

## Project Structure

```
goggins-chatbot/
├── database/
│   └── connection.js          # MongoDB connection management
├── middleware/
│   └── auth.js               # Authentication middleware
├── models/
│   ├── Auth.js              # User authentication model
│   └── User.js              # User data and conversation model
├── routes/
│   └── auth.js              # Authentication routes
├── scripts/
│   ├── create-demo-user.js  # Demo user creation
│   └── clean-indexes.js     # Database maintenance
├── services/
│   └── DatabaseService.js   # Database operations service
├── assets/                  # Audio samples and images
├── voice_samples/          # Voice training samples 
├── output/                 # Generated audio files (auto-created)
├── audio_cache/           # Cached audio files (auto-created)
├── app.js                 # Main client-side application
├── auth.js               # Client-side authentication
├── voice-chat.js         # Voice functionality
├── server.js             # Express server
├── index.html            # Main application page
├── login.html            # Authentication page
├── styles.css            # Application styles
├── login.css             # Login page styles
├── clone_voice.py        # Voice sample creation script
├── generate_speech.py    # Speech generation using voice samples
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/status` - Check authentication status

### Chat & Conversations
- `POST /api/chat` - Send message to chatbot
- `GET /api/history` - Get conversation history
- `GET /api/conversations` - Get all conversations
- `POST /api/conversations` - Create new conversation
- `PUT /api/conversations/:id/switch` - Switch active conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Voice & Audio
- `POST /api/tts` - Generate speech with OpenAI TTS
- `POST /api/tortoise-tts` - Generate speech with Tortoise-TTS
- `GET /api/test-tortoise` - Check Tortoise-TTS setup status

### Settings & Data
- `GET /api/settings` - Get user settings
- `POST /api/settings` - Update user settings
- `GET /api/search` - Search conversations
- `GET /api/user-stats` - Get user statistics
- `GET /api/db-status` - Database connection status

## Configuration Options

### Voice Settings
- **OpenAI Voices**: alloy, echo, fable, onyx, nova, shimmer
- **Custom Voice**: tortoise_goggins (requires setup)
- **Speech Speed**: Adjustable playback speed
- **Speech Recognition**: Browser-based voice input

### Intensity Modes
- **Challenging** (Default): Balanced motivation with tough love
- **Reflective**: Personal stories and life lessons
- **Drill**: High-intensity, drill sergeant approach

### Customization
- **Theme Colors**: Dark themes, military green, blood red, navy blue
- **Message Display**: Timestamps, audio playback buttons
- **Data Persistence**: All settings saved to database

## Database Schema

### Users Collection
- Session management and user preferences
- Conversation threads with full message history
- Audio cache references and settings
- User statistics and activity tracking

### Auth Collection
- Secure user authentication with bcrypt
- Email and username uniqueness
- Session tracking and security features

## Voice Cloning (Advanced)

The application supports high-quality voice cloning using Tortoise-TTS:

1. **Prepare Audio Sample**: Place a clear David Goggins audio file in `/assets/goggin_iso.mp3`
2. **Run Voice Sample Creation**: `python clone_voice.py`
   - This splits your audio into multiple voice samples stored in `/voice_samples/`
   - These samples teach Tortoise-TTS how Goggins sounds
3. **Generate Speech**: Use the Tortoise-TTS option in voice settings
   - The system uses your voice samples to create new speech that mimics Goggins

**How it works**: 
- `clone_voice.py` processes your input audio and creates training samples
- `generate_speech.py` uses these samples to generate new speech in Goggins' voice
- The more quality voice samples you have, the better the voice cloning accuracy

**Note**: Tortoise-TTS generation takes 5-10 minutes per message but provides superior voice quality.

## Security Features

- **Session Management**: Secure MongoDB session store
- **Password Hashing**: bcrypt encryption for all passwords
- **Authentication Middleware**: Protected routes and API endpoints
- **Input Validation**: Sanitized user inputs and API parameters
- **Environment Variables**: Secure API key and database credential storage

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Speech Recognition**: Chrome and Safari (webkit)
- **Audio Playback**: All modern browsers with HTML5 audio support
- **Responsive Design**: Mobile and desktop optimized

## Privacy & Data

- **Local Storage**: User preferences and temporary data
- **Database Storage**: Conversation history and user settings
- **API Usage**: OpenAI for AI responses and voice synthesis
- **No External Tracking**: All data remains within your infrastructure

## Performance Considerations

- **Audio Caching**: Prevents regenerating identical voice messages
- **Database Indexing**: Optimized queries for conversation retrieval
- **Session Management**: Efficient MongoDB session storage
- **Conversation Cleanup**: Automatic maintenance scripts available

## Troubleshooting

### Common Issues

1. **OpenAI API Key Issues**:
   - Verify your API key in the `.env` file
   - Check API quota and billing status
   - Test with `/api/test-key` endpoint

2. **Database Connection**:
   - Ensure MongoDB is running
   - Check connection string format
   - Verify network access to MongoDB Atlas

3. **Voice Features**:
   - Check browser audio permissions
   - Verify microphone access for speech recognition
   - Test Tortoise-TTS setup with `/api/test-tortoise`

4. **Authentication Issues**:
   - Clear browser cookies and localStorage
   - Check session secret configuration
   - Verify MongoDB session store connection

```

