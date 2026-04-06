# Project Scope Document

## Project Title
Multilingual Speech Web Application

## Version
Draft 1.0

## Date
March 21, 2026

## 1. Project Summary
This project is a web-based application that allows users to upload or record audio in different languages and receive an accurate text transcription through a secure backend integrated with the OpenAI Audio API. The project is intended to serve both as a practical productivity tool and as an academic or portfolio project demonstrating modern full-stack development with AI integration.

The implementation will follow a phased scope. The primary delivery is a reliable speech-to-text MVP focused on browser-based file upload and transcription. Additional enhancements such as translation, speaker diarization, and streaming transcription are treated as controlled extensions rather than part of the initial mandatory delivery.

## 2. Problem Statement
Users often need a simple way to convert spoken audio into text without installing specialized software or managing complex AI infrastructure. Existing tools can be expensive, limited, or difficult to customize for academic and portfolio use. This project addresses that gap by providing a browser-based transcription workflow backed by modern AI models through a secure server-side integration.

## 3. Project Goals
- Build a browser-based application for speech-to-text transcription.
- Allow users to upload supported audio files and optionally record audio directly in the browser.
- Process transcription requests through a backend so the API key is never exposed to the client.
- Return readable transcript results with clear loading and error states.
- Design the codebase so future features can be added without major restructuring.
- Produce a polished project suitable for demonstration, documentation, and academic evaluation.

## 4. Stakeholders and Target Users
### Stakeholders
- Student developer or software engineer building the project
- Academic supervisor, mentor, or reviewer
- Test users providing usability and accuracy feedback

### Target Users
- Students converting lectures, notes, or study recordings into text
- Professionals transcribing interviews, meetings, or spoken drafts
- General users who want quick browser-based speech-to-text support

## 5. Scope Overview
The project scope is divided into three levels to keep delivery realistic and well controlled.

### 5.1 In Scope: Core MVP
The following items are part of the main project delivery:
- Web interface for audio file upload
- Optional browser microphone recording if feasible within timeline
- Backend endpoint to receive uploaded audio
- Integration with OpenAI transcription models through a secure backend
- Support for common audio formats such as `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`
- Validation for missing files, invalid formats, and file size limits
- Transcript display in the frontend
- User-friendly error handling and loading states
- Environment-based API key management
- Temporary file handling and cleanup on the server
- Basic project documentation and testing

### 5.2 In Scope: Planned Enhancements
These items are within the broader project scope, but secondary to the MVP:
- Language hint or language selection for better transcription control
- Audio translation support for non-English input
- Timestamped transcript output
- Prompt support for domain-specific words or terminology
- Better transcript formatting and copy or export actions
- Improved UX for long-running transcription requests

### 5.3 Stretch Scope
These items are valuable extensions but not required for the initial successful delivery:
- Speaker diarization for multi-speaker audio
- Streaming or real-time transcription with WebSockets or Realtime APIs
- Transcript summaries or note generation
- Long-audio chunking and asynchronous job handling
- Transcript history or session persistence

## 6. Out of Scope
The following items are explicitly excluded from the current project scope unless later approved:
- Native mobile applications
- Offline transcription or self-hosted model deployment
- Complex user account systems and authentication flows
- Enterprise collaboration features
- Billing systems or multi-tenant subscription management
- Large third-party platform integrations
- Advanced analytics dashboards beyond basic testing insights

## 7. Functional Requirements
### 7.1 Frontend
- Provide a clear UI for selecting or recording audio
- Allow submission of audio to the backend using `multipart/form-data`
- Show upload, processing, success, and error states
- Display returned transcript content in a readable format
- Prevent submission when the input is invalid

### 7.2 Backend
- Expose a transcription endpoint such as `/api/transcribe`
- Accept audio uploads from the frontend
- Validate input type and size before forwarding to the AI service
- Call the OpenAI Audio Transcriptions API using a configured model
- Return structured JSON responses for success and failure cases
- Protect API credentials using environment variables

### 7.3 Data Handling
- Process temporary files safely
- Remove temporary uploads after transcription where applicable
- Avoid exposing sensitive keys or internal error details to end users

## 8. Non-Functional Requirements
- Security: API keys must never be exposed in client-side code
- Usability: the interface should be simple enough for first-time users
- Performance: short audio files should return results within acceptable time for demo use
- Reliability: invalid inputs and upstream API failures should be handled gracefully
- Maintainability: the project should use a modular backend structure where possible
- Extensibility: translation, diarization, and streaming should be addable without redesigning the full system

## 9. Technical Scope and Architecture
### Recommended Stack
- Frontend: HTML, CSS, JavaScript or React
- Backend: Node.js with Express
- File handling: `multer` or equivalent
- AI integration: OpenAI SDK with transcription models such as `gpt-4o-transcribe` or `whisper-1`

### Core Architecture
- Browser client handles user interaction and file selection
- Backend server receives uploads and communicates with the OpenAI API
- OpenAI performs the transcription and returns text or structured output
- Backend sends cleaned results back to the frontend

### Extension Points
Future routes may include:
- `/api/translate`
- `/api/diarize`
- `/api/jobs`

Future transcript objects may expand beyond raw text to include:
- `text`
- `language`
- `segments`
- `speakers`
- `timestamps`
- `summary`
- `status`
- `error`

## 10. Assumptions and Constraints
### Assumptions
- The project will use a single OpenAI API key for all selected models
- The development environment will support `.env` configuration for local work
- Users will provide audio files within the API size constraints
- The first delivery prioritizes stable file-based transcription over advanced real-time features

### Constraints
- OpenAI audio uploads are limited to supported file formats and size limits
- Accuracy depends on recording quality, language clarity, and background noise
- Real-time streaming and diarization add significant complexity and are not guaranteed in the MVP
- Academic timelines may require prioritizing delivery quality over feature breadth

## 11. Deliverables
- Source code for frontend and backend components
- Working transcription endpoint and connected user interface
- Basic validation, error handling, and loading feedback
- Project documentation, including setup steps and usage notes
- Scope document, architecture notes, and test evidence

## 12. Milestones
### Phase 1: Requirements and Setup
- Finalize scope and architecture
- Prepare development environment
- Configure API access and environment variables

### Phase 2: Backend Transcription
- Implement file upload handling
- Connect backend to OpenAI transcription API
- Test transcription with sample files

### Phase 3: Frontend Integration
- Build upload interface
- Connect frontend to backend
- Display transcript results and error states

### Phase 4: Enhancements
- Add language-related controls and UX improvements
- Explore translation and richer transcript output

### Phase 5: Testing and Documentation
- Test across multiple sample files and scenarios
- Complete technical and academic documentation

## 13. Risks and Mitigations
### Risk: API Misconfiguration
Mitigation: use environment variables, documented setup steps, and backend-only API calls.

### Risk: Poor Audio Quality
Mitigation: validate supported formats, provide clear guidance, and allow later prompt or post-processing improvements.

### Risk: Scope Creep
Mitigation: treat translation, diarization, and streaming as phased enhancements rather than mandatory MVP features.

### Risk: Large File or Long Processing Times
Mitigation: enforce limits, show progress states, and plan async or chunking improvements for later phases.

## 14. Success Criteria
The project will be considered successful if:
- A user can upload a supported audio file through the web interface
- The backend securely sends the audio to OpenAI for transcription
- The application returns and displays a readable transcript
- Common failure cases are handled with understandable messages
- The system is documented clearly enough for setup, demo, and academic review
- The architecture supports future expansion without major rewrites

## 15. Scope Approval Statement
This scope defines the intended boundaries of the Multilingual Speech Web Application for its current academic and portfolio-oriented delivery. Any major addition beyond the MVP, especially real-time streaming, full diarization workflows, or broader platform integrations, should be treated as a separate approved enhancement.
