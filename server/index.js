const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const { Server: SocketIO } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { transcribeAudio } = require('./services/transcriptionService');
const { translateText, translateTextDAI } = require('./services/translationService');
const { getUserContext, buildWhisperPrompt, buildSystemPrompt, learnNewTerms, ensureUserProfile } = require('./utils/dai');
const { logUsage } = require('./utils/costTracker');
const { serviceSupabase, authSupabase } = require('./supabaseClients');
const { requireAuth } = require('./middleware/requireAuth');
const { attachUserIfPresent } = require('./middleware/attachUserIfPresent');
const { parseCookies, setSessionCookies, clearSessionCookies } = require('./utils/authCookies');
require('dotenv').config();

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;
const BASE_STT_PROMPT = 'Transcribe only the dominant nearby speaker. Ignore background chatter, TV audio, overlapping far voices, filler noise, and repeated hallucinated phrases. If speech is unclear, return only the clearly spoken words.';

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

// ==========================
// Socket.IO — Meeting Mode (Phase 3)
// ==========================
const io = new SocketIO(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// Track active rooms: roomId → { members: Set<socketId>, hostId, targetLanguage }
const meetingRooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Meeting] Client connected: ${socket.id}`);

  // Join a meeting room (roomId = sessionId from LiveTranslate)
  socket.on('meeting:join', ({ roomId, displayName }) => {
    socket.join(roomId);

    if (!meetingRooms.has(roomId)) {
      meetingRooms.set(roomId, {
        members: new Set(),
        hostId: socket.id,
        createdAt: Date.now(),
      });
    }
    const room = meetingRooms.get(roomId);
    room.members.add(socket.id);

    // Notify everyone in the room
    io.to(roomId).emit('meeting:member-update', {
      count: room.members.size,
      members: Array.from(room.members),
    });

    console.log(`[Meeting] ${displayName || socket.id} joined room ${roomId} (${room.members.size} members)`);
  });

  // Leave a room
  socket.on('meeting:leave', ({ roomId }) => {
    socket.leave(roomId);
    if (meetingRooms.has(roomId)) {
      const room = meetingRooms.get(roomId);
      room.members.delete(socket.id);
      if (room.members.size === 0) {
        meetingRooms.delete(roomId);
        console.log(`[Meeting] Room ${roomId} closed (empty)`);
      } else {
        io.to(roomId).emit('meeting:member-update', {
          count: room.members.size,
          members: Array.from(room.members),
        });
      }
    }
  });

  socket.on('disconnect', () => {
    // Clean up from all rooms
    for (const [roomId, room] of meetingRooms) {
      if (room.members.has(socket.id)) {
        room.members.delete(socket.id);
        if (room.members.size === 0) {
          meetingRooms.delete(roomId);
        } else {
          io.to(roomId).emit('meeting:member-update', {
            count: room.members.size,
            members: Array.from(room.members),
          });
        }
      }
    }
    console.log(`[Meeting] Client disconnected: ${socket.id}`);
  });
});

// Helper: broadcast an utterance to a meeting room
function broadcastUtterance(sessionId, utterance) {
  if (meetingRooms.has(sessionId)) {
    io.to(sessionId).emit('meeting:utterance', utterance);
  }
}

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
    const networkCode = error?.cause?.code || error?.code;
    if (networkCode === 'ENOTFOUND' || networkCode === 'ECONNRESET' || networkCode === 'ETIMEDOUT') {
      console.warn('Auth Me Warning: Supabase unreachable, treating request as signed-out.');
      return res.status(401).json({ error: 'Auth service temporarily unavailable.' });
    }
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
    const targetLanguage = req.body.targetLanguage?.trim();
    const originalName = req.file.originalname || 'audio.webm';
    const transcriptionVerbose = await transcribeAudio(req.file.path, originalName, 'verbose_json', BASE_STT_PROMPT);
    const originalText = transcriptionVerbose?.text || '';
    const detectedLanguage = transcriptionVerbose?.language || 'auto';
    let transcription = transcriptionVerbose;

    if (format === 'text') {
      transcription = originalText;
    } else if (format === 'json') {
      transcription = { text: originalText, language: detectedLanguage };
    }

    let translatedText = null;

    if (targetLanguage && originalText?.trim()) {
      translatedText = await translateText(originalText, targetLanguage, detectedLanguage);
      logUsage('llama-3.3-70b-versatile', originalText.length / 4);
    }

    console.log('Upload Translation:', {
      detectedLanguage,
      targetLanguage: targetLanguage || null,
      originalPreview: originalText?.slice(0, 120),
      translatedPreview: translatedText?.slice(0, 120) || null
    });

    res.json({
      success: true,
      transcription,
      originalText,
      translatedText,
      detectedLanguage,
      targetLanguage: targetLanguage || null
    });
  } catch (error) {
    // Clean up file on error
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
    console.error('Transcribe API Error:', error);
    const status = error.status === 403 ? 403 : 500;
    const errorCode = error.status === 403 ? 'AI_PROVIDER_ACCESS_DENIED' : 'TRANSCRIBE_FAILED';
    res.status(status).json({
      error: error.message,
      errorCode,
      provider: error.provider || 'unknown',
      providerMessage: error.providerMessage || error.message
    });
  }
});

// ==========================
// Translate Pipeline Endpoint
// ==========================
app.post('/api/translate', translateLimiter, attachUserIfPresent, upload.single('audio'), async (req, res) => {
  try {
    const { sessionId, targetLanguage, userId } = req.body;
    let sessionState = {};
    try { sessionState = JSON.parse(req.body.sessionState || '{}'); } catch {}
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided.' });
    }

    if ((req.file.size || 0) < 12000) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(200).json({
        success: false,
        skipped: true,
        errorCode: 'AUDIO_CHUNK_SKIPPED',
        providerMessage: 'Audio chunk too short for transcription.'
      });
    }

    const originalName = req.file.originalname || 'chunk.webm';
    
    let whisperPrompt = BASE_STT_PROMPT;
    let systemPrompt = undefined;
    let fallbackToStandard = true;
    
    if (userId && process.env.DAI_ENABLED !== 'false') {
      try {
        await ensureUserProfile(userId);
        const { profile, vocab } = await getUserContext(userId);
        const vocabPrompt = buildWhisperPrompt(vocab);
        whisperPrompt = `${BASE_STT_PROMPT} ${vocabPrompt}`.trim();
        systemPrompt = buildSystemPrompt(profile, vocab, sessionState);
        fallbackToStandard = false;
      } catch (e) {
        console.error('DAI Context Build Error:', e);
      }
    }

    // 1. STT (Groq Whisper-large-v3-turbo)
    const transcription = await transcribeAudio(req.file.path, originalName, 'verbose_json', whisperPrompt);
    const originalText = typeof transcription === 'string' ? transcription : transcription.text;
    const detectedLanguage = transcription.language || 'auto';
    logUsage('whisper-large-v3-turbo', 5);

    // 2. Translation
    let result = {};
    if (!fallbackToStandard) {
      result = await translateTextDAI(originalText, targetLanguage || 'English', systemPrompt);
      logUsage('llama-3.3-70b-versatile', originalText.length / 4);
      
      // Async learn new terms
      if (result.new_terms && result.new_terms.length > 0) {
        learnNewTerms(userId, result.new_terms).catch(console.error);
      }
    } else {
      const translatedText = await translateText(originalText, targetLanguage || 'English');
      result = { translatedText, detectedLanguage, confidence: 1.0, emotionalTone: 'neutral', inferredIntent: false, alt_1: null, alt_2: null };
      logUsage('llama-3.3-70b-versatile', originalText.length / 4);
    }

    // 4. Persistence (Supabase)
    if (sessionId) {
      const { error: dbError } = await serviceSupabase
        .from('utterances')
        .insert([{
          session_id: sessionId,
          text_original: originalText,
          text_translated: result.translatedText,
          language_code: result.detectedLanguage,
          emotional_tone: result.emotionalTone,
          inferred_intent: result.inferredIntent,
          alt_1: result.alt_1,
          alt_2: result.alt_2
        }]);

      if (dbError) console.error('Supabase Persistence Error:', dbError);
    }

    const responsePayload = {
      success: true,
      originalText,
      translatedText: result.translatedText,
      detectedLanguage: result.detectedLanguage,
      confidence: result.confidence,
      emotionalTone: result.emotionalTone,
      inferredIntent: result.inferredIntent,
      alt_1: result.alt_1,
      alt_2: result.alt_2,
      timestamp: new Date().toISOString()
    };

    // Meeting Mode: broadcast this utterance to all room members
    if (sessionId) {
      broadcastUtterance(sessionId, responsePayload);
    }

    res.json(responsePayload);

  } catch (error) {
    try { if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path); } catch {}
    console.error('Pipeline Error:', error);
    const providerMessage = (error.providerMessage || error.message || '').toLowerCase();

    if (providerMessage.includes('audio file is too short')) {
      return res.status(200).json({
        success: false,
        skipped: true,
        errorCode: 'AUDIO_CHUNK_SKIPPED',
        provider: error.provider || 'groq',
        providerMessage: error.providerMessage || error.message
      });
    }

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

// End a session and trigger post-session AI
const Groq = require('groq-sdk');
const groqLocal = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.post('/api/sessions/end', attachUserIfPresent, async (req, res) => {
  try {
    const { sessionId, utterances, sessionMeta, userId } = req.body;
    
    // We already persisted utterances in real-time, but here the client
    // provides the final utterances array and metadata for summarization.

    res.json({ success: true, sessionId });

    // Fire summary + vocab learning async (no await)
    runPostSessionAI(sessionId, utterances, sessionMeta, userId).catch(console.error);

  } catch (error) {
    console.error('Session End Error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function runPostSessionAI(sessionId, utterances, meta, userId) {
  if (!process.env.DAI_ENABLED || !sessionId) return;
  const summaryPrompt = `
    Analyze this translation session and return ONLY JSON:
    Target language: ${meta?.targetLanguage || 'unknown'}
    Utterances: ${JSON.stringify((utterances||[]).slice(0, 30))}
    Return:
    {
      "summary": "...",
      "main_topics": ["...", "..."],
      "action_items": ["..."],
      "key_decisions": ["..."],
      "domain": "...",
      "session_quality": {
        "avg_confidence": 0.9,
        "dominant_source_language": "...",
        "code_switching_detected": true
      }
    }
  `;
  const res = await groqLocal.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: 'user', content: summaryPrompt }],
  });

  let summary;
  try { summary = JSON.parse(res.choices[0].message.content); } catch { return; }
  await serviceSupabase.from('session_summaries').insert({ session_id: sessionId, ...summary });
}

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
// ElevenLabs HD Voice TTS (Phase 2)
// ==========================
// Proxy endpoint so the API key stays server-side.
// POST /api/tts/elevenlabs  { text, languageCode }
// Returns: audio/mpeg stream
app.post('/api/tts/elevenlabs', translateLimiter, async (req, res) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.status(501).json({ error: 'ElevenLabs HD Voice is not configured. Set ELEVENLABS_API_KEY in .env.' });
    }

    const { text, languageCode } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ error: 'Missing `text` field.' });
    }

    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
    const model = process.env.ELEVENLABS_MODEL || 'eleven_flash_v2_5';

    // ElevenLabs uses 2-letter ISO codes (hi, ta, en), not BCP-47 (hi-IN, ta-IN)
    // The client sends BCP-47, so we strip the region suffix
    const ELEVENLABS_SUPPORTED = new Set([
      'en','ja','zh','de','hi','fr','ko','pt','it','es','ru','id','nl','tr',
      'fil','pl','sv','bg','ro','ar','cs','el','fi','hr','ms','sk','da',
      'ta','uk','hu','no','vi'
    ]);
    let resolvedLang = null;
    if (languageCode) {
      const prefix = languageCode.split('-')[0].toLowerCase();
      if (ELEVENLABS_SUPPORTED.has(prefix)) {
        resolvedLang = prefix;
      }
    }

    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.slice(0, 5000), // ElevenLabs max ~5000 chars
          model_id: model,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
          ...(resolvedLang ? { language_code: resolvedLang } : {}),
        }),
      }
    );

    if (!elevenRes.ok) {
      const errBody = await elevenRes.text();
      console.error('ElevenLabs API Error:', elevenRes.status, errBody);
      return res.status(elevenRes.status).json({ error: 'ElevenLabs API error', details: errBody });
    }

    // Stream audio back to client
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Transfer-Encoding', 'chunked');

    const reader = elevenRes.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); return; }
        res.write(Buffer.from(value));
      }
    };
    await pump();

  } catch (error) {
    console.error('ElevenLabs TTS Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================
// Start Server
// ==========================
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`✅ Startup Guard: All required API keys validated.`);
  console.log(`📡 Models: whisper-large-v3-turbo + llama-3.3-70b-versatile`);
  console.log(`🔗 Meeting Mode: Socket.IO enabled`);
  console.log(`🛡  Rate Limits: Transcribe 10/15min | Translate 60/hr\n`);
});
