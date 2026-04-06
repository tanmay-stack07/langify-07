const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { transcribeAudio } = require('./services/transcriptionService');
const { translateText } = require('./services/translationService');
const { logUsage } = require('./utils/costTracker');
const supabase = require('./supabaseClient');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Startup Guard
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'GROQ_API_KEY'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
  console.error('The server will now HALT as per System Plan.');
  process.exit(1);
}

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Multer Setup for Audio Uploads
const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit for Whisper
});

// Rate Limiters
const transcribeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many transcription requests. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const translateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  message: { error: 'Too many translation requests. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ==========================
// Health Check
// ==========================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    models: {
      stt: 'whisper-large-v3-turbo',
      llm: 'llama-3.3-70b-versatile'
    }
  });
});

// ==========================
// Transcribe Endpoint
// ==========================
app.post('/api/transcribe', transcribeLimiter, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const format = req.query.format || 'verbose_json';
    const originalName = req.file.originalname || 'audio.webm';
    const transcription = await transcribeAudio(req.file.path, originalName, format);

    res.json({ success: true, transcription });
  } catch (error) {
    // Clean up file on error
    try { if (req.file) fs.unlinkSync(req.file.path); } catch {}
    console.error('Transcribe API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// Translate Pipeline Endpoint
// ==========================
app.post('/api/translate', translateLimiter, upload.single('audio'), async (req, res) => {
  try {
    const { sessionId, targetLanguage } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided.' });
    }

    const originalName = req.file.originalname || 'chunk.webm';

    // 1. STT (Groq Whisper-large-v3-turbo)
    const transcription = await transcribeAudio(req.file.path, originalName, 'verbose_json');
    const originalText = typeof transcription === 'string' ? transcription : transcription.text;
    logUsage('whisper-large-v3-turbo', 5);

    // 2. Translation (Groq LLaMA-3.3-70B)
    const translatedText = await translateText(originalText, targetLanguage || 'English');
    logUsage('llama-3.3-70b-versatile', originalText.length / 4);

    // 3. Detect language from transcription
    const detectedLanguage = transcription.language || 'auto';

    // 4. Persistence (Supabase)
    if (sessionId) {
      const { error: dbError } = await supabase
        .from('utterances')
        .insert([{
          session_id: sessionId,
          text_original: originalText,
          text_translated: translatedText,
          language_code: detectedLanguage
        }]);
      
      if (dbError) console.error('Supabase Persistence Error:', dbError);
    }

    res.json({
      success: true,
      originalText,
      translatedText,
      detectedLanguage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    try { if (req.file) fs.unlinkSync(req.file.path); } catch {}
    console.error('Pipeline Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// Session Management Endpoints
// ==========================

// Create a new session
app.post('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert([{ metadata: req.body.metadata || {} }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, session: data });
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// List all sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ sessions: data });
  } catch (error) {
    console.error('List Sessions Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get utterances for a session
app.get('/api/sessions/:sessionId/utterances', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('utterances')
      .select('*')
      .eq('session_id', req.params.sessionId)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    res.json({ utterances: data });
  } catch (error) {
    console.error('Get Utterances Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// Start Server
// ==========================
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Startup Guard: All required API keys validated.`);
  console.log(`📡 Models: whisper-large-v3-turbo + llama-3.3-70b-versatile`);
  console.log(`🛡  Rate Limits: Transcribe 10/15min | Translate 60/hr\n`);
});
