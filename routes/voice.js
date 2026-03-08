const express = require('express');
const router = express.Router();
require('dotenv').config();

// ── Amazon Polly ───────────────────────────────────────────────
const { PollyClient, SynthesizeSpeechCommand } = require('@aws-sdk/client-polly');

const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN && { sessionToken: process.env.AWS_SESSION_TOKEN })
  } : undefined // falls back to IAM role / credential chain
});

// Map browser language codes → Polly voice IDs
// Polly supports a subset of Indian languages; others fall back to browser TTS
const POLLY_VOICES = {
  'en':    { VoiceId: 'Joanna',  LanguageCode: 'en-US' },
  'en-US': { VoiceId: 'Joanna',  LanguageCode: 'en-US' },
  'en-IN': { VoiceId: 'Aditi',   LanguageCode: 'hi-IN' }, // closest accent
  'hi':    { VoiceId: 'Kajal',   LanguageCode: 'hi-IN' },
  'hi-IN': { VoiceId: 'Kajal',   LanguageCode: 'hi-IN' },
  'bn':    { VoiceId: 'Kajal',   LanguageCode: 'hi-IN' }, // fallback voice
  'mr':    { VoiceId: 'Kajal',   LanguageCode: 'hi-IN' }, // fallback voice
};

// POST /api/voice/synthesize
// Body: { text: string, lang: string }
// Returns: audio/mpeg binary stream
router.post('/synthesize', async (req, res) => {
  const { text, lang } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  // Strip HTML tags before sending to Polly
  const plainText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const langKey = lang ? lang.split('-')[0].toLowerCase() : 'en';
  const voice = POLLY_VOICES[langKey] || POLLY_VOICES['en'];

  try {
    const command = new SynthesizeSpeechCommand({
      Text: plainText.substring(0, 3000), // Polly limit
      OutputFormat: 'mp3',
      VoiceId: voice.VoiceId,
      LanguageCode: voice.LanguageCode,
      Engine: 'neural' // Higher quality neural TTS
    });

    const response = await pollyClient.send(command);

    // Stream the audio back to the client
    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'no-cache');

    // response.AudioStream is a readable stream from AWS SDK v3
    const chunks = [];
    for await (const chunk of response.AudioStream) {
      chunks.push(chunk);
    }
    res.send(Buffer.concat(chunks));

  } catch (err) {
    console.error('Amazon Polly error:', err.message);
    // Return 503 so frontend knows to fall back to browser TTS
    res.status(503).json({ error: 'Polly unavailable', details: err.message });
  }
});

// GET /api/voice/voices — for the frontend to discover supported langs
router.get('/voices', (req, res) => {
  res.json({
    supported: Object.keys(POLLY_VOICES),
    provider: 'Amazon Polly'
  });
});

module.exports = router;
