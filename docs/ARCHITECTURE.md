# Akkio Voice Onboarding — Architecture

## Overview

A mobile-first web app that replaces a static 35-question form with a voice-driven AI interview. The user talks to the app, the AI asks smart follow-up questions, and at the end it generates a structured "context packet" — a system prompt that configures their Akkio AI assistant.

## System Diagram

```
┌──────────────────────────────────────────────────┐
│  Browser (React + Vite)                          │
│  ┌──────────────────────────────────────────┐    │
│  │  App.jsx — single-page app               │    │
│  │  ├─ Welcome screen (start button)        │    │
│  │  ├─ Chat interface (messages + mic)      │    │
│  │  │   ├─ Topic coverage pills             │    │
│  │  │   ├─ Message bubbles (user + AI)      │    │
│  │  │   ├─ Live transcript preview          │    │
│  │  │   └─ Input area (text + mic button)   │    │
│  │  └─ Complete screen (generate packet)    │    │
│  └──────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────┐    │
│  │  useDeepgramSTT hook                     │    │
│  │  ├─ getUserMedia → AudioContext          │    │
│  │  ├─ ScriptProcessor → Int16 PCM          │    │
│  │  └─ WebSocket → server /ws/transcribe    │    │
│  └──────────────────────────────────────────┘    │
└────────────────┬─────────────────────────────────┘
                 │
    HTTP (REST)  │  WebSocket
                 │
┌────────────────▼─────────────────────────────────┐
│  Server (Node.js / Express)                      │
│                                                  │
│  server/proxy.js                                 │
│  ├─ POST /api/interview — SSE stream             │
│  │   ├─ Manages session state (messages, facts)  │
│  │   ├─ Calls Claude API with streaming          │
│  │   ├─ Parses JSON response, extracts facts     │
│  │   └─ Returns structured SSE events            │
│  ├─ POST /api/generate-packet                    │
│  │   └─ Synthesizes context packet from session  │
│  ├─ GET  /api/session/:id — session info         │
│  ├─ GET  /api/health — status check              │
│  └─ WS  /ws/transcribe — Deepgram STT relay      │
│      ├─ Receives PCM audio from browser           │
│      ├─ Forwards to Deepgram Nova-3 via WS        │
│      └─ Returns transcript events to browser      │
│                                                  │
│  server/interview-prompt.js                      │
│  ├─ TOPICS — topic definitions with openers      │
│  ├─ FACT_SCHEMA — structured extraction schema   │
│  ├─ buildSystemPrompt() — generates AI prompt    │
│  └─ buildPacketPrompt() — generates packet prompt│
└──────────────────────────────────────────────────┘
                 │
                 ▼
     ┌───────────────────┐    ┌──────────────────┐
     │  Anthropic API    │    │  Deepgram API    │
     │  (Claude Sonnet)  │    │  (Nova-3 STT)    │
     └───────────────────┘    └──────────────────┘
```

## Data Flow

### Voice Input Flow
1. User taps mic → `getUserMedia()` captures audio
2. `AudioContext` + `ScriptProcessor` converts to 16-bit PCM @ 16kHz
3. PCM chunks sent via WebSocket to server `/ws/transcribe`
4. Server relays to Deepgram Nova-3 WebSocket
5. Deepgram returns interim + final transcripts
6. Server forwards to browser
7. Browser shows live preview (interim) and accumulates finals
8. On utterance end (1.5s silence) or mic stop, accumulated text is sent as a message

### Interview Flow
1. Browser sends user message to `POST /api/interview`
2. Server adds message to session, calls Claude with full conversation history + system prompt
3. Claude streams back a JSON response with: reply, topics_covered, facts_extracted, confidence
4. Server parses, updates session state, forwards structured result to browser via SSE
5. Browser displays AI reply, updates topic pills, speaks reply via browser TTS

### Packet Generation Flow
1. User clicks "Generate Context Packet" on the complete screen
2. Browser calls `POST /api/generate-packet` with session ID
3. Server builds prompt from accumulated facts + transcript using `buildPacketPrompt()`
4. Claude generates structured system prompt
5. Browser displays result with copy button

## Session State

Sessions are in-memory (Map). Each session contains:
- `messages` — full conversation history (for Claude context)
- `facts` — accumulated extracted facts (merged from each turn)
- `topicsCovered` — which topics have sufficient data
- `complete` — whether the interview is done
- `createdAt` — timestamp

Sessions are NOT persisted. Refreshing the page starts a new session.

## Key Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| STT provider | Deepgram Nova-3 | Best real-time accuracy, proper noun handling, $200 free credits |
| Audio format | Linear16 PCM @ 16kHz | Deepgram's recommended format for streaming |
| TTS | Browser SpeechSynthesis | Free, zero latency, good enough for MVP |
| LLM response format | Structured JSON | Enables fact extraction + topic tracking alongside conversation |
| Session storage | In-memory Map | Simple for MVP. Add Redis/DB for persistence later. |
| Mobile approach | Responsive web + PWA | No app store friction. Add-to-homescreen for native feel. |
