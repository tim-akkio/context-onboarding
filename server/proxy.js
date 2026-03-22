/**
 * server/proxy.js
 *
 * Express server with:
 * - Anthropic Claude API proxy (streaming + non-streaming)
 * - Deepgram STT WebSocket relay
 * - Interview session state management
 */

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

// ── Interview topic schema ──────────────────────────────────────────────────
const TOPICS = [
  { id: "business", label: "Your Business", covered: false },
  { id: "platform", label: "Platform Use", covered: false },
  { id: "data", label: "Your Data", covered: false },
  { id: "data_behavior", label: "Data Behavior", covered: false },
  { id: "calculations", label: "Calculations & Metrics", covered: false },
  { id: "visuals", label: "Visuals & Dashboards", covered: false },
  { id: "ai_behavior", label: "AI Behavior & Guardrails", covered: false },
  { id: "team", label: "Your Team", covered: false },
  { id: "language", label: "Industry Language", covered: false },
];

const INTERVIEW_SYSTEM_PROMPT = `You are an expert onboarding interviewer for Akkio, an AI analytics platform. Your job is to have a natural, conversational interview with a new customer to learn everything needed to configure their AI assistant.

## Your Personality
- Warm, professional, and efficient
- Ask one focused question at a time
- Acknowledge what they said before asking the next question
- Use their terminology once you learn it
- Keep responses SHORT — 2-3 sentences max. This is a voice conversation.

## Topics to Cover
You need to gather information across these 9 areas:
1. **Business** — What they do, industry, customers, markets, culture
2. **Platform Use** — How they'll use Akkio, what questions users ask, workflows
3. **Data** — Data sources, what rows represent, key columns, confusing fields
4. **Data Behavior** — Update frequency, quality issues, filters, seasonality, volume, sensitive fields
5. **Calculations** — Key metrics, custom formulas, how to handle missing data, common mistakes
6. **Visuals** — Chart preferences, branding, default dashboard views
7. **AI Behavior** — Guardrails, tone, uncertainty handling, compliance
8. **Team** — User personas, permission levels, success criteria
9. **Language** — Industry jargon, acronyms, terms with special meaning

## Interview Strategy
- Start with Business basics to build rapport
- Let their answers naturally guide which topic to explore next
- If they mention data or metrics while talking about their business, follow that thread
- Don't rigidly follow the topic order — be conversational
- When a topic feels well-covered, smoothly transition to the next
- After covering ~7-8 topics, ask if there's anything else they'd like to add

## Response Format
ALWAYS respond with valid JSON in this exact format:
{
  "reply": "Your spoken response to the user — keep it conversational and SHORT",
  "topics_covered": ["business", "platform"],
  "facts_extracted": {
    "company_name": "Acme Corp",
    "industry": "AdTech"
  },
  "interview_complete": false
}

- "reply" — what you say back (will be spoken aloud via TTS)
- "topics_covered" — array of topic IDs that now have sufficient info (cumulative)
- "facts_extracted" — key-value pairs of NEW facts learned from THIS turn only
- "interview_complete" — set true only when you've covered all topics or user says they're done

## Important
- Extract concrete facts, not summaries. "company_name": "Locality" not "they are an ad company"
- Keep facts granular: separate "data_sources", "key_columns", "update_frequency" etc.
- If the user gives a short/unclear answer, ask a brief follow-up before moving on
- NEVER ask more than one question at a time`;

// ── In-memory session store ─────────────────────────────────────────────────
const sessions = new Map();

function getOrCreateSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      messages: [],
      facts: {},
      topicsCovered: [],
      complete: false,
      createdAt: Date.now(),
    });
  }
  return sessions.get(sessionId);
}

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasAnthropicKey: !!ANTHROPIC_KEY,
    hasDeepgramKey: !!DEEPGRAM_KEY,
  });
});

// ── Interview chat endpoint (streaming) ─────────────────────────────────────
app.post("/api/interview", async (req, res) => {
  const { sessionId, userMessage } = req.body;
  if (!sessionId || !userMessage) {
    return res.status(400).json({ error: "sessionId and userMessage required" });
  }

  const session = getOrCreateSession(sessionId);
  session.messages.push({ role: "user", content: userMessage });

  try {
    // Set up SSE for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: INTERVIEW_SYSTEM_PROMPT,
        messages: session.messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      res.write(`data: ${JSON.stringify({ error: "Claude API error", status: response.status })}\n\n`);
      res.end();
      return;
    }

    let fullText = "";

    // Stream SSE from Anthropic to client
    for await (const chunk of response.body) {
      const text = chunk.toString();
      const lines = text.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              // Forward the text delta to the client
              res.write(`data: ${JSON.stringify({ type: "delta", text: parsed.delta.text })}\n\n`);
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    // Parse the complete response as JSON to extract structured data
    let parsed;
    try {
      // Claude might wrap JSON in markdown code fences
      const cleaned = fullText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // If parsing fails, treat the whole thing as a reply
      parsed = {
        reply: fullText,
        topics_covered: session.topicsCovered,
        facts_extracted: {},
        interview_complete: false,
      };
    }

    // Update session state
    session.messages.push({ role: "assistant", content: fullText });
    if (parsed.facts_extracted) {
      Object.assign(session.facts, parsed.facts_extracted);
    }
    if (parsed.topics_covered) {
      session.topicsCovered = parsed.topics_covered;
    }
    if (parsed.interview_complete) {
      session.complete = true;
    }

    // Send final structured message
    res.write(`data: ${JSON.stringify({
      type: "complete",
      reply: parsed.reply || fullText,
      topicsCovered: session.topicsCovered,
      factsExtracted: session.facts,
      interviewComplete: session.complete,
    })}\n\n`);

    res.end();
  } catch (err) {
    console.error("Interview error:", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Generate context packet from session ────────────────────────────────────
app.post("/api/generate-packet", async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({ error: "Invalid or missing sessionId" });
  }

  const session = sessions.get(sessionId);

  const prompt = `Based on this interview data, generate a comprehensive AI context packet — a structured system prompt that could be loaded into an AI assistant to give it deep understanding of this customer's business, data, and needs.

## Extracted Facts
${JSON.stringify(session.facts, null, 2)}

## Full Interview Transcript
${session.messages.map((m) => `${m.role === "user" ? "Customer" : "Interviewer"}: ${m.role === "assistant" ? (() => { try { return JSON.parse(m.content.replace(/\`\`\`json\n?/g, "").replace(/\`\`\`\n?/g, "").trim()).reply; } catch { return m.content; } })() : m.content}`).join("\n\n")}

Generate the context packet now. Make it thorough, structured, and immediately usable as a system prompt.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    res.json({ packet: data.content?.[0]?.text || "Error generating packet" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Session info ────────────────────────────────────────────────────────────
app.get("/api/session/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json({
    topicsCovered: session.topicsCovered,
    facts: session.facts,
    complete: session.complete,
    messageCount: session.messages.length,
  });
});

// ── Create HTTP server + WebSocket for Deepgram STT relay ───────────────────
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

wss.on("connection", (clientWs) => {
  console.log("Client connected for transcription");

  if (!DEEPGRAM_KEY) {
    clientWs.send(JSON.stringify({ error: "DEEPGRAM_API_KEY not configured" }));
    clientWs.close();
    return;
  }

  // Open WebSocket to Deepgram
  const dgUrl =
    "wss://api.deepgram.com/v1/listen?" +
    "model=nova-3&" +
    "language=en&" +
    "smart_format=true&" +
    "punctuate=true&" +
    "interim_results=true&" +
    "utterance_end_ms=1500&" +
    "vad_events=true&" +
    "encoding=linear16&" +
    "sample_rate=16000&" +
    "channels=1";

  const dgWs = new WebSocket(dgUrl, {
    headers: { Authorization: `Token ${DEEPGRAM_KEY}` },
  });

  dgWs.on("open", () => {
    console.log("Connected to Deepgram");
    clientWs.send(JSON.stringify({ type: "ready" }));
  });

  dgWs.on("message", (data) => {
    // Forward Deepgram transcription results to the client
    try {
      const result = JSON.parse(data.toString());
      if (result.type === "Results") {
        const transcript = result.channel?.alternatives?.[0]?.transcript;
        const isFinal = result.is_final;
        if (transcript) {
          clientWs.send(JSON.stringify({ type: "transcript", transcript, isFinal }));
        }
      } else if (result.type === "UtteranceEnd") {
        clientWs.send(JSON.stringify({ type: "utterance_end" }));
      }
    } catch {
      // Skip unparseable messages
    }
  });

  dgWs.on("error", (err) => {
    console.error("Deepgram WS error:", err.message);
    clientWs.send(JSON.stringify({ error: "Deepgram connection error" }));
  });

  dgWs.on("close", () => {
    console.log("Deepgram connection closed");
  });

  // Forward audio from client to Deepgram
  clientWs.on("message", (data) => {
    if (dgWs.readyState === WebSocket.OPEN) {
      dgWs.send(data);
    }
  });

  clientWs.on("close", () => {
    console.log("Client disconnected");
    if (dgWs.readyState === WebSocket.OPEN) {
      dgWs.close();
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket STT relay on ws://localhost:${PORT}/ws/transcribe`);
});
