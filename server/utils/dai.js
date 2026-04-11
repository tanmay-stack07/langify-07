const supabase = require('../supabaseClient');

// ── MASTER SYSTEM PROMPT TEMPLATE ───────────────────────────────────
const MASTER_PROMPT_TEMPLATE = `
You are Langify's Dialect-Adaptive Translation Engine (DATE).

CORE MISSION:
Translate speech from ANY language into the user's chosen target language, understanding their personal accent, local vocabulary, code-switching patterns, and emotional intent.

TRANSLATION RULES:
1. NEVER ask the user what language they are speaking. Auto-detect always.
2. Handle mixed-language speech (Hinglish, Marathi-English) naturally.
3. If source equals target language, return original text unchanged.
4. Preserve emotional register — frustration, excitement, formality.
5. If speech is fragmented or trails off, infer the full intended meaning from context and express it completely. Do NOT translate literally.

PERSONAL CONTEXT:
User vocabulary: {{VOCAB}}
Speech patterns: {{PATTERNS}}
Domain: {{DOMAIN}}
Session topic: {{TOPIC}}
Recent utterances: {{RECENT}}

DIALECT RULES:
- Treat all vocabulary map words as valid with their mapped meanings.
- Unknown local/slang words: infer from context, flag as new_terms.
- Code-switching (Hinglish, Marathi-English): detect dominant language for metadata, translate entire utterance seamlessly.

EMOTIONAL TONE:
- Detect: neutral | frustrated | urgent | excited | sarcastic | formal
- Reflect same register in target language via word choice.

OUTPUT — respond ONLY with this JSON, no other text:
{
  "translatedText": "<translation>",
  "detectedLanguage": "<ISO 639-1>",
  "confidence": <0.0-1.0>,
  "emotionalTone": "<tone>",
  "inferredIntent": <true|false>,
  "alt_1": "<alt if confidence < 0.72, else null>",
  "alt_2": "<alt if confidence < 0.72, else null>",
  "new_terms": [{ "term": "<word>", "inferred_meaning": "<meaning>" }]
}
`;

// ── FETCH USER PROFILE + VOCABULARY FROM SUPABASE ───────────────────
async function getUserContext(userId) {
  const [profileRes, vocabRes] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('user_id', userId).single(),
    supabase.from('user_vocabulary').select('*').eq('user_id', userId).order('uses', { ascending: false }).limit(200),
  ]);
  const profile = profileRes.data || { domain: 'general', speech_patterns: [] };
  const vocab = {};
  (vocabRes.data || []).forEach(v => {
    vocab[v.term] = { meaning: v.meaning, language: v.language };
  });
  return { profile, vocab };
}

// ── BUILD WHISPER PROMPT (injects known vocab for better transcription) ──
function buildWhisperPrompt(vocab) {
  const terms = Object.keys(vocab).slice(0, 50).join(', ');
  if (!terms) return undefined;
  return `User commonly uses: ${terms}.`;
}

// ── BUILD GPT-4O SYSTEM PROMPT ────────────────────────────────────────
function buildSystemPrompt(profile, vocab, sessionState) {
  const recentLines = (sessionState?.utterances || [])
    .slice(-3)
    .map(u => `[${u.detectedLanguage}] ${u.originalText} => ${u.translatedText}`)
    .join('\n') || 'none yet';
  
  return MASTER_PROMPT_TEMPLATE
    .replace('{{VOCAB}}', JSON.stringify(vocab))
    .replace('{{PATTERNS}}', (profile.speech_patterns || []).join(', ') || 'none detected yet')
    .replace('{{DOMAIN}}', profile.domain || 'general')
    .replace('{{TOPIC}}', sessionState?.inferredTopic || 'not yet determined')
    .replace('{{RECENT}}', recentLines);
}

// ── UPSERT NEW TERMS INTO user_vocabulary ─────────────────────────────
async function learnNewTerms(userId, newTerms) {
  if (!newTerms || newTerms.length === 0) return;
  for (const { term, inferred_meaning } of newTerms) {
    await supabase.from('user_vocabulary').upsert({
      user_id: userId,
      term,
      meaning: inferred_meaning,
      last_seen: new Date().toISOString(),
    }, {
      onConflict: 'user_id,term',
      ignoreDuplicates: false
    });
    // Increment uses on conflict
    await supabase.rpc('increment_vocab_uses', { p_user_id: userId, p_term: term });
  }
}

// ── ENSURE USER PROFILE EXISTS ────────────────────────────────────────
async function ensureUserProfile(userId) {
  await supabase.from('user_profiles').upsert(
    { user_id: userId, updated_at: new Date().toISOString() },
    { onConflict: 'user_id', ignoreDuplicates: true }
  );
}

module.exports = {
  getUserContext,
  buildWhisperPrompt,
  buildSystemPrompt,
  learnNewTerms,
  ensureUserProfile
};
