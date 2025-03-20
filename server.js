const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(path.join(__dirname)));

// API key endpoint
app.get('/api-key', (req, res) => {
  if (process.env.OPENAI_API_KEY) {
    res.json({ key: process.env.OPENAI_API_KEY });
  } else {
    res.status(404).json({ error: 'API key not found in environment variables' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`OpenAI API Key ${process.env.OPENAI_API_KEY ? 'is' : 'is NOT'} available`);
});