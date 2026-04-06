# Comprehensive System Plan: Multilingual Speech Web Application

This document outlines the technical architecture, project roadmap, and execution strategy for the **Multilingual Speech Web Application**, a universal live translation platform.

---

## 1. Executive Summary & Core Identity
The core goal is a **Universal Live Speech Translation Platform**: "Speak any language. Always get your language back."
*   **Zero Configuration**: The user never selects a source language.
*   **Dual-Model Pipeline**: Whisper-1 (Auto-detection + STT) → GPT-4o (Nuanced Translation).
*   **Persistent Sessions**: Every session is saved to Supabase for history and export.

---

## 2. Recommended Tech Stack
Based on the PRD and Design specifications, the following stack is recommended for maximum reliability and state-of-the-art performance:

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | **Vue.js 3 + Vite** | Highly reactive state management for complex live sessions. |
| **Styling** | **Tailwind CSS** | Rapid, pixel-perfect implementation of the Design Doc's color tokens. |
| **Backend** | **Node.js + Express** | High-performance handling of binary audio streams and API middleware. |
| **Database** | **Supabase (PostgreSQL)** | Robust persistence with built-in auth and simple JSON storage for transcripts. |
| **AI (Speech)** | **OpenAI Whisper-1** | Industry-leading STT with integrated automatic language detection. |
| **AI (Text)** | **OpenAI GPT-4o** | Handles complex, code-switched translation (e.g., Hinglish, Manglish). |
| **File Handling** | **Multer** | Efficient memory-based storage for audio chunks (no disk I/O lag). |

---

## 3. Phase-by-Phase Execution Plan (14 Weeks)

### Phase 1: Infrastructure & Supabase (Weeks 1–2)
*   **Tasks**:
    *   Initialize Node.js/Express and Vue.js/Vite projects.
    *   Configure Supabase projects and create `sessions` and `utterances` tables.
    *   Set up `.env` with API keys and implement startup validation.
*   **Deliverables**: Working backend/frontend skeletons connected to a live database.

### Phase 2: Backend Transcription MVP (Weeks 3–4)
*   **Tasks**:
    *   Implement `/api/transcribe` for file uploads.
    *   Integrate Whisper-1 SDK.
    *   Implement format conversion for SRT/VTT.
*   **Deliverables**: Functional file-based transcription endpoint with diverse format support.

### Phase 3: The Translation Pipeline — CORE (Weeks 5–8)
*   **Tasks**:
    *   Implement the Two-Model Pipeline (`translationService.js`).
    *   Engineered GPT-4o prompts for code-switching and zero-config.
    *   Build the `useMediaRecorder` composable for 5s audio chunking.
    *   Develop the real-time state machine in `useSession.js`.
*   **Deliverables**: End-to-end live translation flow with auto-detection.

### Phase 4: Frontend UI implementation (Weeks 9–10)
*   **Tasks**:
    *   Implement the **Jarvis Loader** (AiLoader.vue) and **JarvisOverlay**.
    *   Build the dark-themed Live Translate page and agent HUD.
    *   Implement landing page and file upload/recording tabs.
*   **Deliverables**: Polished, design-compliant UI with advanced AI animations.

### Phase 5: QA, Polish & Accuracy Tuning (Weeks 11–12)
*   **Tasks**:
    *   Stress test with multilingual inputs (Hindi, Marathi, Hinglish).
    *   Optimize latency and cost management.
    *   Generate technical and academic documentation.
*   **Deliverables**: Comprehensive test report and finalized source code.

### Phase 6: Deployment & Final Demo (Weeks 13–14)
*   **Tasks**:
    *   Deploy to Railway/Render.
    *   Verify production environment variables.
    *   Prepare demo assets (sample audio clips).
*   **Deliverables**: Live production URL and finalized project submission.

---

## 4. Structured Testing Strategy
Testing will be performed at the end of every phase to ensure "perfectionism and quality."

### 4.1 Unit & Integration Testing
*   **Pipeline Validation**: Test `/api/translate` with sample 5s audio blobs in 5+ languages.
*   **Database Integrity**: Verify batch-saves correctly populate both `sessions` and `utterances`.

### 4.2 Accuracy Benchmarking (The "Accuracy Table")
For each major release, we will test:
1.  **Clean Speech**: (English, Hindi, Marathi) - Target >90% accuracy.
2.  **Code-Switched**: (Hinglish, Manglish) - Target >85% translation clarity.
3.  **Low Audio Quality**: Test handling of background noise and "low confidence" states.

### 4.3 UI/UX Verification
*   **Jarvis Cycle**: Verify Analyzing → Processing → Translating → Finalizing timing.
*   **Responsiveness**: Test on mobile (iPhone/Android) vs. Desktop (1280px+).

---

## 5. API Key Management & Progress Halting
To ensure cost control and security, we are implementing a **"Gatekeeper System"**:

1.  **Startup Guard**: The server will **HALT** (exit) immediately if `OPENAI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` are missing from `.env`.
2.  **Manual Key Checkpoints**: At the start of Phase 2, 3, and 6, I will pause and ask you to confirm that the keys are active and have sufficient credits.
3.  **Rate Limiting**: Every key-using endpoint is protected by `express-rate-limit` (60/hour for translation, 10/15min for transcription).
4.  **Cost Dashboard**: I will provide instructions on setting up an OpenAI usage cap to prevent unexpected bills.

---

## 6. Next Steps & Approval
I am standing by for your command to begin **Phase 1: Requirements and Setup**. 

> [!IMPORTANT]
> The next action will be project initialization. Please confirm if you approve this plan or if you would like any modifications to the tech stack or timeline.
