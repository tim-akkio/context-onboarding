# Quickstart

## Prerequisites

- Node.js 18+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- (Optional) A Deepgram API key for voice input ([console.deepgram.com](https://console.deepgram.com) — $200 free credits, no CC required)

## Setup

```bash
# Clone
git clone https://github.com/tim-akkio/context-onboarding.git
cd context-onboarding

# Install
npm install

# Configure
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY (required) and DEEPGRAM_API_KEY (optional)

# Run
npm run dev
```

This starts:
- Vite dev server on `http://localhost:5173` (the app)
- Express API server on `http://localhost:3001` (proxied automatically)

## Usage

1. Open `http://localhost:5173` in your browser (or on your phone on the same network)
2. Click **Start Interview**
3. Talk or type — the AI will interview you about your business, data, and team
4. Watch the topic pills go green as topics are covered
5. When done, click **Generate Context Packet**
6. Copy the result — it's a ready-to-use system prompt

## Without Deepgram (text-only mode)

If you don't have a Deepgram API key, voice input won't work but everything else does. Just type your answers instead of speaking.

## Mobile Access

Open `http://<your-local-ip>:5173` on your phone. The app is designed mobile-first with:
- Touch-friendly mic button with pulse animation
- Horizontal scrolling topic pills
- Safe area insets for notched phones
- PWA manifest — add to home screen for a native-like experience

## Project Structure

```
context-onboarding/
├── src/
│   ├── App.jsx          ← UI: chat interface, voice input, topic tracker
│   └── main.jsx         ← React entry point
├── server/
│   ├── proxy.js          ← API server: interview endpoint, STT relay, session mgmt
│   └── interview-prompt.js ← Interview engine: topics, fact schema, prompt generation
├── docs/
│   ├── ARCHITECTURE.md   ← System design and data flow
│   ├── INTERVIEW-PROMPT.md ← Prompt editing guide and fact schema reference
│   └── QUICKSTART.md     ← This file
├── public/
│   └── manifest.json     ← PWA manifest
├── .env.example          ← Environment variable template
├── package.json
└── vite.config.js
```

## Common Tasks

### Change the interview questions
Edit `TOPICS` in `server/interview-prompt.js`. See `docs/INTERVIEW-PROMPT.md` for the full guide.

### Add a new fact to extract
Edit `FACT_SCHEMA` in `server/interview-prompt.js`. The prompt auto-regenerates.

### Change the AI personality
Edit the `WHO YOU ARE` section in `buildSystemPrompt()` in `server/interview-prompt.js`.

### Change the output packet format
Edit `buildPacketPrompt()` in `server/interview-prompt.js`.

## Pending Setup (TODO)

- [ ] Add Anthropic API key to `.env`
- [ ] Sign up for Deepgram and add API key to `.env`
- [ ] Test voice connection end-to-end
