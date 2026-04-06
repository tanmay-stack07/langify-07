# Technical Documentation: Multilingual Speech Web Application

## Architecture Overview
The application uses a **Dual-Model Pipeline** for zero-config live translation.
- **Frontend**: Vue.js 3 + Vite. Uses `MediaRecorder` for 5-second audio chunking.
- **Backend**: Node.js + Express. Orchestrates Whisper-1 (STT) and GPT-4o (Translation).
- **Persistence**: Supabase (PostgreSQL) for session and utterance history.

## API Endpoints
### `POST /api/health`
- Returns system status.

### `POST /api/transcribe`
- **Desc**: Upload audio and get Whisper-1 transcript.
- **Form Data**: `audio` (file).

### `POST /api/translate`
- **Desc**: High-nuance translate-and-persist pipeline.
- **Form Data**: `audio`, `sessionId`, `targetLanguage`.

## Design System
- **Colors**: Dark mode base (#050505) with Cyan/Blue neon glows.
- **Animations**: CSS-based pulse and SVG-rotate for the "Jarvis" HUD.

## Implementation Details
- **Zero-Config**: GPT-4o detects source language automatically.
- **Chunking**: Fixed 5-second intervals to balance latency and context quality.
