/**
 * server/proxy.js
 *
 * Express server with:
 * - SQLite-backed session/invitation/client storage
 * - JWT auth for admin users and invited interviewees
 * - Admin API for managing clients, invitations, transcripts, exports
 * - Anthropic Claude API proxy (streaming)
 * - Deepgram STT WebSocket relay
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

import { TOPICS, buildSystemPrompt, buildPacketPrompt } from "./interview-prompt.js";
import {
  initDb, createClient, getClient, listClients, deleteClient,
  createInvitation, getInvitation, getInvitationByToken, getInvitationsByClient,
  updateInvitationStatus, updateInvitationSentAt,
  createSession, getSession, getSessionByInvitation, updateSession,
  savePacket, getPacket, getPacketsForClient,
  createAdminUser, getAdminByEmail, adminCount,
} from "./db.js";
import { signToken, verifyToken, hashPassword, checkPassword, requireAdmin, requireInvitation } from "./auth.js";
import { initEmail, sendInvitationEmail } from "./email.js";

// ── Initialize ──────────────────────────────────────────────────────────────
initDb();
initEmail();

// Build both system prompts at startup (they're static)
const SYSTEM_PROMPTS = {
  executive: buildSystemPrompt("executive"),
  technical: buildSystemPrompt("technical"),
};

const app = express();
const PORT = process.env.PROXY_PORT || 3001;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const DEEPGRAM_KEY = process.env.DEEPGRAM_API_KEY;

if (!ANTHROPIC_KEY) {
  console.error("ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.");
  process.exit(1);
}

app.use(cors({ origin: process.env.APP_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// ── Rate limiting ───────────────────────────────────────────────────────────
const loginLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: { error: "Too many login attempts. Try again in a minute." } });
const invitationLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: "Too many requests. Try again in a minute." } });
const interviewLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: { error: "Rate limit exceeded. Please slow down." } });

const isProd = process.env.NODE_ENV === "production";
const cookieOpts = { httpOnly: true, sameSite: "lax", secure: isProd, maxAge: 7 * 24 * 60 * 60 * 1000 };

// ── Seed admin user on first run ────────────────────────────────────────────
if (adminCount() === 0) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("FATAL: ADMIN_EMAIL and ADMIN_PASSWORD env vars are required for initial admin setup.");
    process.exit(1);
  }
  createAdminUser(email, hashPassword(password));
  console.log(`Seeded admin user: ${email}`);
}

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasAnthropicKey: !!ANTHROPIC_KEY,
    hasDeepgramKey: !!DEEPGRAM_KEY,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Admin login ─────────────────────────────────────────────────────────────
app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const admin = getAdminByEmail(email);
  if (!admin || !checkPassword(password, admin.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken({ role: "admin", adminId: admin.id, email: admin.email });
  res.cookie("token", token, cookieOpts);
  res.json({ token, email: admin.email });
});

// ── Invitation auth — user clicks link from email ───────────────────────────
app.get("/api/auth/invitation/:token", invitationLimiter, (req, res) => {
  const invitation = getInvitationByToken(req.params.token);
  if (!invitation) return res.status(404).json({ error: "Invalid invitation link" });

  // Create or resume session
  let session = getSessionByInvitation(invitation.id);
  if (!session) {
    session = createSession(invitation.id, invitation.track);
    if (invitation.status === "invited") {
      updateInvitationStatus(invitation.id, "started");
    }
  }

  const token = signToken({
    role: "interviewee",
    invitationId: invitation.id,
    sessionId: session.id,
    track: invitation.track,
    clientId: invitation.client_id,
    clientName: invitation.client_name,
    email: invitation.email,
    name: invitation.name,
  });

  res.cookie("token", token, cookieOpts);
  res.json({
    token,
    track: invitation.track,
    sessionId: session.id,
    clientName: invitation.client_name,
    complete: session.complete,
    name: invitation.name,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// INTERVIEW ENDPOINTS (require invitation auth)
// ═══════════════════════════════════════════════════════════════════════════

// ── Interview chat (streaming) ──────────────────────────────────────────────
app.post("/api/interview", interviewLimiter, requireInvitation, async (req, res) => {
  const { userMessage } = req.body;
  const { sessionId, track } = req.interviewee;

  if (!userMessage) return res.status(400).json({ error: "userMessage required" });

  const systemPrompt = SYSTEM_PROMPTS[track] || SYSTEM_PROMPTS.executive;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.messages.push({ role: "user", content: userMessage });

  try {
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
        system: systemPrompt,
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
    let sseBuffer = "";

    for await (const chunk of response.body) {
      sseBuffer += chunk.toString();

      // Process complete lines only; keep the last partial line in the buffer
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              res.write(`data: ${JSON.stringify({ type: "delta", text: parsed.delta.text })}\n\n`);
            }
          } catch {
            // Partial JSON — will be completed by the next chunk
          }
        }
      }
    }

    // Parse structured response
    let parsed;
    try {
      const cleaned = fullText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
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
      updateInvitationStatus(req.interviewee.invitationId, "completed");
    }

    // Persist to DB
    updateSession(sessionId, {
      messages: session.messages,
      facts: session.facts,
      topicsCovered: session.topicsCovered,
      complete: session.complete,
    });

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

// ── Generate context packet ─────────────────────────────────────────────────
app.post("/api/generate-packet", requireInvitation, async (req, res) => {
  const { sessionId, clientId, track } = req.interviewee;
  const session = getSession(sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const prompt = buildPacketPrompt(session.facts, session.messages);

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
    const content = data.content?.[0]?.text || "Error generating packet";

    // Save packet to DB
    savePacket(clientId, content, { sessionId, track });

    res.json({ packet: content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Session info ────────────────────────────────────────────────────────────
app.get("/api/session/:id", requireInvitation, (req, res) => {
  if (req.params.id !== req.interviewee.sessionId) {
    return res.status(403).json({ error: "Access denied" });
  }
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  res.json({
    topicsCovered: session.topicsCovered,
    facts: session.facts,
    complete: session.complete,
    messageCount: session.messages.length,
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS (require admin auth)
// ═══════════════════════════════════════════════════════════════════════════

// ── Clients ─────────────────────────────────────────────────────────────────
app.get("/api/admin/clients", requireAdmin, (req, res) => {
  res.json(listClients());
});

app.post("/api/admin/clients", requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Client name required" });

  try {
    const client = createClient(name);
    res.status(201).json(client);
  } catch (err) {
    if (err.message.includes("UNIQUE")) {
      return res.status(409).json({ error: "A client with that name already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/clients/:id", requireAdmin, (req, res) => {
  const client = getClient(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const invitations = getInvitationsByClient(req.params.id);
  const packets = getPacketsForClient(req.params.id);
  res.json({ ...client, invitations, packets });
});

app.delete("/api/admin/clients/:id", requireAdmin, (req, res) => {
  deleteClient(req.params.id);
  res.json({ ok: true });
});

// ── Invitations ─────────────────────────────────────────────────────────────
app.post("/api/admin/clients/:id/invitations", requireAdmin, async (req, res) => {
  const client = getClient(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const { invitations } = req.body;
  if (!Array.isArray(invitations) || invitations.length === 0) {
    return res.status(400).json({ error: "invitations array required" });
  }

  const results = [];
  for (const inv of invitations) {
    const { email, track, name } = inv;
    if (!email || !track) {
      results.push({ email, error: "email and track required" });
      continue;
    }
    if (!["executive", "technical"].includes(track)) {
      results.push({ email, error: "track must be executive or technical" });
      continue;
    }

    try {
      const invitation = createInvitation(client.id, email, track, name || null);

      // Send email
      try {
        await sendInvitationEmail({
          to: email,
          clientName: client.name,
          track,
          token: invitation.token,
          recipientName: name,
        });
        updateInvitationSentAt(invitation.id);
      } catch (emailErr) {
        console.error(`Failed to send email to ${email}:`, emailErr.message);
      }

      results.push({ email, track, id: invitation.id, status: "invited" });
    } catch (err) {
      if (err.message.includes("UNIQUE")) {
        results.push({ email, error: "Already invited" });
      } else {
        results.push({ email, error: err.message });
      }
    }
  }

  res.status(201).json(results);
});

app.post("/api/admin/invitations/:id/resend", requireAdmin, async (req, res) => {
  const invitation = getInvitation(req.params.id);
  if (!invitation) return res.status(404).json({ error: "Invitation not found" });

  const client = getClient(invitation.client_id);

  try {
    await sendInvitationEmail({
      to: invitation.email,
      clientName: client.name,
      track: invitation.track,
      token: invitation.token,
      recipientName: invitation.name,
    });
    updateInvitationSentAt(invitation.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Transcripts ─────────────────────────────────────────────────────────────
app.get("/api/admin/sessions/:id", requireAdmin, (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// ── Export ───────────────────────────────────────────────────────────────────

function buildExportFilename(clientSlug, track, userName, date) {
  const d = date || new Date().toISOString().slice(0, 10);
  const parts = [clientSlug];
  if (track) parts.push(track);
  if (userName) parts.push(userName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  parts.push(d);
  return parts.join("_") + ".md";
}

// Export a single session as markdown
app.post("/api/admin/sessions/:id/export", requireAdmin, async (req, res) => {
  const session = getSession(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Get invitation + client info
  const row = getInvitation(session.invitation_id);
  if (!row) return res.status(404).json({ error: "Invitation not found" });
  const client = getClient(row.client_id);

  const prompt = buildPacketPrompt(session.facts, session.messages);

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
    const content = data.content?.[0]?.text || "Error generating packet";

    const packet = savePacket(client.id, content, { sessionId: session.id, track: session.track });
    const filename = buildExportFilename(client.slug, session.track, row.name || row.email.split("@")[0]);

    res.json({ packet: content, filename, packetId: packet.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export combined packet for a client (merges all completed sessions)
app.post("/api/admin/clients/:id/export", requireAdmin, async (req, res) => {
  const client = getClient(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });

  const invitations = getInvitationsByClient(client.id);
  const completedSessions = invitations
    .filter((inv) => inv.session_id)
    .map((inv) => getSession(inv.session_id))
    .filter((s) => s);

  if (completedSessions.length === 0) {
    return res.status(400).json({ error: "No completed interviews to export" });
  }

  // Merge facts from all sessions
  const mergedFacts = {};
  const allMessages = [];
  for (const session of completedSessions) {
    Object.assign(mergedFacts, session.facts);
    allMessages.push(...session.messages);
  }

  const prompt = buildPacketPrompt(mergedFacts, allMessages);

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
    const content = data.content?.[0]?.text || "Error generating packet";

    const packet = savePacket(client.id, content);
    const filename = buildExportFilename(client.slug);

    res.json({ packet: content, filename, packetId: packet.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a saved packet
app.get("/api/admin/packets/:id", requireAdmin, (req, res) => {
  const packet = getPacket(req.params.id);
  if (!packet) return res.status(404).json({ error: "Packet not found" });
  res.json(packet);
});

// ═══════════════════════════════════════════════════════════════════════════
// STATIC FILE SERVING (production)
// ═══════════════════════════════════════════════════════════════════════════

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, "..", "dist");

// Serve built frontend assets
app.use(express.static(distPath));

// SPA fallback — serve index.html for any non-API route
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(distPath, "index.html"));
});

// ═══════════════════════════════════════════════════════════════════════════
// DEEPGRAM STT WEBSOCKET RELAY
// ═══════════════════════════════════════════════════════════════════════════

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/transcribe" });

wss.on("connection", (clientWs, req) => {
  // Authenticate WebSocket via token query param
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");
  if (!token) {
    clientWs.send(JSON.stringify({ error: "Authentication required" }));
    clientWs.close(4401, "Authentication required");
    return;
  }
  try {
    const payload = verifyToken(token);
    if (payload.role !== "interviewee") throw new Error("Invalid role");
  } catch {
    clientWs.send(JSON.stringify({ error: "Invalid or expired token" }));
    clientWs.close(4401, "Invalid token");
    return;
  }

  console.log("Client connected for transcription");

  if (!DEEPGRAM_KEY) {
    clientWs.send(JSON.stringify({ error: "DEEPGRAM_API_KEY not configured" }));
    clientWs.close();
    return;
  }

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
      // Skip unparseable
    }
  });

  dgWs.on("error", (err) => {
    console.error("Deepgram WS error:", err.message);
    clientWs.send(JSON.stringify({ error: "Deepgram connection error" }));
  });

  dgWs.on("close", () => {
    console.log("Deepgram connection closed");
  });

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

// ── Process error handlers ──────────────────────────────────────────────────
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket STT relay on ws://localhost:${PORT}/ws/transcribe`);
});
