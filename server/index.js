const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { transcribeAudio } = require('./services/transcriptionService');
const { translateText } = require('./services/translationService');
const { logUsage } = require('./utils/costTracker');
const { serviceSupabase, authSupabase } = require('./supabaseClients');
const { requireAuth } = require('./middleware/requireAuth');
const { attachUserIfPresent } = require('./middleware/attachUserIfPresent');
const { parseCookies, setSessionCookies, clearSessionCookies } = require('./utils/authCookies');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Startup Guard
const REQUIRED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'GROQ_API_KEY'];
const missing = REQUIRED_ENV.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missing.join(', ')}`);
  console.error('The server will now HALT as per System Plan.');
  process.exit(1);
}

const allowedOrigins = [
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Please wait a few minutes.' },
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
// Auth Endpoints
// ==========================
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const { data, error } = await authSupabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data.session) {
      return res.status(400).json({
        error: 'Signup succeeded but no active session was returned. Disable email confirmation in Supabase Auth to use immediate login.'
      });
    }

    setSessionCookies(res, data.session);
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const email = req.body.email?.trim();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data, error } = await authSupabase.auth.signInWithPassword({ email, password });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    setSessionCookies(res, data.session);
    res.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const accessToken = cookies['langify-access-token'];

    if (!accessToken) {
      return res.status(401).json({ error: 'Not signed in.' });
    }

    const { data, error } = await authSupabase.auth.getUser(accessToken);

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid or expired session.' });
    }

    res.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email
      }
    });
  } catch (error) {
    console.error('Auth Me Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    clearSessionCookies(res);
    res.json({ success: true });
  } catch {
    clearSessionCookies(res);
    res.json({ success: true });
  }
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
app.post('/api/translate', translateLimiter, attachUserIfPresent, upload.single('audio'), async (req, res) => {
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
      const { error: dbError } = await serviceSupabase
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
    const status = error.status === 403 ? 403 : 500;
    const errorCode = error.status === 403 ? 'AI_PROVIDER_ACCESS_DENIED' : 'PIPELINE_FAILED';

    res.status(status).json({
      error: error.message,
      errorCode,
      provider: error.provider || 'unknown',
      providerMessage: error.providerMessage || error.message
    });
  }
});

// ==========================
// Session Management Endpoints
// ==========================

// Create a new session
app.post('/api/sessions', attachUserIfPresent, async (req, res) => {
  try {
    const { data, error } = await serviceSupabase
      .from('sessions')
      .insert([{
        metadata: req.body.metadata || {},
        user_id: req.user?.id || null
      }])
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
app.get('/api/sessions', attachUserIfPresent, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ sessions: [] });
    }

    const { data, error } = await serviceSupabase
      .from('sessions')
      .select('*')
      .eq('user_id', req.user.id)
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
app.get('/api/sessions/:sessionId/utterances', attachUserIfPresent, async (req, res) => {
  try {
    if (!req.user) {
      return res.json({ utterances: [] });
    }

    const { data: ownedSession, error: sessionError } = await serviceSupabase
      .from('sessions')
      .select('id, user_id')
      .eq('id', req.params.sessionId)
      .single();

    if (sessionError || !ownedSession || ownedSession.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const { data, error } = await serviceSupabase
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
