import { useState, useRef, useEffect, useCallback } from "react";

// ── Generate a unique session ID ────────────────────────────────────────────
const SESSION_ID = crypto.randomUUID();

// ── Topic definitions per track (mirrors server/interview-prompt.js) ─────────
const TOPICS = {
  executive: [
    { id: "business", label: "Business" },
    { id: "strategy", label: "Strategy" },
    { id: "users", label: "Users" },
    { id: "questions", label: "Questions" },
    { id: "guardrails", label: "Guardrails" },
    { id: "success", label: "Success" },
    { id: "language_exec", label: "Language" },
  ],
  technical: [
    { id: "data_sources", label: "Sources" },
    { id: "schema", label: "Schema" },
    { id: "data_quality", label: "Quality" },
    { id: "metrics", label: "Metrics" },
    { id: "query_patterns", label: "Queries" },
    { id: "edge_cases", label: "Pitfalls" },
    { id: "sensitive_data", label: "Sensitive" },
    { id: "visuals", label: "Visuals" },
    { id: "language_tech", label: "Terms" },
  ],
};

// ── Styles ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }
  body { background: #0A0F1E; }

  .app {
    font-family: 'DM Sans', sans-serif;
    background: #0A0F1E;
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    color: #E8EDF8;
    overflow: hidden;
  }

  /* ── Header ── */
  .header {
    flex-shrink: 0;
    background: rgba(10,15,30,0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #1A2240;
    padding: 12px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 10;
  }
  .header-brand {
    font-size: 13px;
    font-weight: 600;
    color: #1860DC;
    letter-spacing: 0.06em;
  }
  .header-status {
    font-size: 12px;
    color: #8B9BB4;
    font-family: 'DM Mono', monospace;
  }

  /* ── Topic pills ── */
  .topics-bar {
    flex-shrink: 0;
    display: flex;
    gap: 6px;
    padding: 10px 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    border-bottom: 1px solid #1A2240;
  }
  .topics-bar::-webkit-scrollbar { display: none; }
  .topic-pill {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 500;
    background: #141C32;
    color: #8B9BB4;
    border: 1px solid #1A2240;
    transition: all 0.3s;
    white-space: nowrap;
  }
  .topic-pill.covered {
    background: rgba(0,196,160,0.12);
    color: #00C4A0;
    border-color: rgba(0,196,160,0.3);
  }
  /* ── Messages area ── */
  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    -webkit-overflow-scrolling: touch;
  }

  .msg {
    max-width: 85%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 15px;
    line-height: 1.5;
    animation: fadeIn 0.3s ease;
  }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .msg.ai {
    align-self: flex-start;
    background: #141C32;
    border: 1px solid #1A2240;
    border-bottom-left-radius: 4px;
    color: #E8EDF8;
  }
  .msg.user {
    align-self: flex-end;
    background: #1860DC;
    border-bottom-right-radius: 4px;
    color: white;
  }
  .msg.thinking {
    align-self: flex-start;
    background: #141C32;
    border: 1px solid #1A2240;
    border-bottom-left-radius: 4px;
    color: #8B9BB4;
    font-style: italic;
  }

  /* ── Live transcript preview ── */
  .live-transcript {
    flex-shrink: 0;
    padding: 8px 20px;
    min-height: 32px;
    font-size: 14px;
    color: #8B9BB4;
    font-style: italic;
    border-top: 1px solid #1A2240;
    background: rgba(10,15,30,0.6);
    transition: opacity 0.2s;
  }
  .live-transcript.empty { opacity: 0; }

  /* ── Input area ── */
  .input-area {
    flex-shrink: 0;
    padding: 12px 16px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    background: rgba(10,15,30,0.95);
    backdrop-filter: blur(12px);
    border-top: 1px solid #1A2240;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .text-input {
    flex: 1;
    background: #141C32;
    border: 1px solid #1A2240;
    border-radius: 24px;
    padding: 10px 16px;
    color: #E8EDF8;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    outline: none;
    transition: border-color 0.2s;
  }
  .text-input:focus { border-color: #1860DC; }
  .text-input::placeholder { color: #3A4660; }

  .mic-btn {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    background: #1860DC;
    color: white;
    font-size: 22px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
    position: relative;
  }
  .mic-btn:active { transform: scale(0.95); }
  .mic-btn.recording {
    background: #F87171;
    animation: pulse 1.5s ease infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0.4); }
    50% { box-shadow: 0 0 0 12px rgba(248,113,113,0); }
  }
  .mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .send-btn {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    border: none;
    background: #00C4A0;
    color: #080D1A;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .send-btn:active { transform: scale(0.95); }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── Welcome screen ── */
  .welcome {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
  }
  .welcome-icon { font-size: 48px; margin-bottom: 20px; }
  .welcome-badge {
    font-size: 11px;
    font-weight: 600;
    color: #1860DC;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
    font-family: 'DM Mono', monospace;
  }
  .welcome-title {
    font-size: 28px;
    font-weight: 700;
    color: #E8EDF8;
    margin-bottom: 10px;
    line-height: 1.2;
  }
  .welcome-sub {
    font-size: 15px;
    color: #8B9BB4;
    max-width: 400px;
    line-height: 1.6;
    margin-bottom: 32px;
  }
  .btn-start {
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    font-weight: 600;
    padding: 16px 40px;
    border-radius: 28px;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, #1860DC, #00C4A0);
    color: white;
    transition: all 0.2s;
  }
  .btn-start:active { transform: scale(0.97); }

  /* ── Complete screen ── */
  .complete-overlay {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
  }
  .complete-icon { font-size: 56px; margin-bottom: 16px; }
  .complete-title { font-size: 24px; font-weight: 700; color: #E8EDF8; margin-bottom: 8px; }
  .complete-sub { font-size: 14px; color: #8B9BB4; margin-bottom: 24px; max-width: 340px; line-height: 1.5; }
  .btn-generate {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    padding: 14px 32px;
    border-radius: 12px;
    cursor: pointer;
    border: none;
    background: linear-gradient(135deg, #1860DC, #00C4A0);
    color: white;
    transition: all 0.2s;
    margin-bottom: 16px;
  }
  .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
  .packet-output {
    width: 100%;
    max-width: 600px;
    max-height: 300px;
    overflow-y: auto;
    background: #0A0F1E;
    border: 1px solid #1A2240;
    border-radius: 10px;
    padding: 16px;
    margin-top: 12px;
    text-align: left;
  }
  .packet-output pre {
    white-space: pre-wrap;
    font-family: 'DM Mono', monospace;
    font-size: 12px;
    color: #E8EDF8;
    line-height: 1.6;
  }
  .btn-copy {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    padding: 8px 20px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid #1A2240;
    background: transparent;
    color: #8B9BB4;
    transition: all 0.15s;
    margin-top: 8px;
  }
  .btn-copy:hover { border-color: #8B9BB4; color: #E8EDF8; }

  /* ── Spinner ── */
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.2);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    vertical-align: middle;
    margin-right: 6px;
  }
`;

// ── Mic SVG icon ────────────────────────────────────────────────────────────
const MicIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="1" width="6" height="12" rx="3" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Custom hook: Deepgram STT via WebSocket ─────────────────────────────────
function useDeepgramSTT({ onTranscript, onUtteranceEnd, onInterimTranscript }) {
  const wsRef = useRef(null);
  const mediaRef = useRef(null);
  const processorRef = useRef(null);
  const contextRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const [ready, setReady] = useState(false);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      const ws = new WebSocket(`ws://${window.location.hostname}:3001/ws/transcribe`);
      wsRef.current = ws;

      ws.onopen = () => setReady(true);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "ready") {
          setReady(true);
        } else if (data.type === "transcript") {
          if (data.isFinal) {
            onTranscript?.(data.transcript);
          } else {
            onInterimTranscript?.(data.transcript);
          }
        } else if (data.type === "utterance_end") {
          onUtteranceEnd?.();
        } else if (data.error) {
          console.error("STT error:", data.error);
        }
      };

      ws.onerror = (err) => console.error("WS error:", err);
      ws.onclose = () => {
        setReady(false);
        setRecording(false);
      };

      // Process audio: MediaStream → ScriptProcessor → 16-bit PCM → WebSocket
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      contextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          int16[i] = Math.max(-32768, Math.min(32767, Math.round(float32[i] * 32767)));
        }
        ws.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      mediaRef.current = stream;
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [onTranscript, onUtteranceEnd, onInterimTranscript]);

  const stop = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }
    if (mediaRef.current) {
      mediaRef.current.getTracks().forEach((t) => t.stop());
      mediaRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setRecording(false);
    setReady(false);
  }, []);

  return { recording, ready, start, stop };
}

// ── App Component ───────────────────────────────────────────────────────────
export default function App() {
  const [track, setTrack] = useState(null); // "executive" | "technical"
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [finalizedChunks, setFinalizedChunks] = useState([]);
  const [topicsCovered, setTopicsCovered] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [packet, setPacket] = useState("");
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking, interimText]);

  // ── Send message to interview API ───────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID, userMessage: text.trim(), track }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process SSE events
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "complete") {
              setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
              setTopicsCovered(data.topicsCovered || []);
              if (data.interviewComplete) setInterviewComplete(true);

              // Speak the reply using browser TTS
              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance(data.reply);
                utterance.rate = 1.05;
                utterance.pitch = 1.0;
                speechSynthesis.speak(utterance);
              }
            }
          } catch {
            // Skip unparseable
          }
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      setMessages((prev) => [...prev, { role: "ai", text: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking]);

  // ── Deepgram STT hooks ────────────────────────────────────────────────────
  const handleFinalTranscript = useCallback((text) => {
    setFinalizedChunks((prev) => [...prev, text]);
  }, []);

  const handleInterimTranscript = useCallback((text) => {
    setInterimText(text);
  }, []);

  const handleUtteranceEnd = useCallback(() => {
    // When the user stops speaking, combine finalized chunks and send
    setFinalizedChunks((prev) => {
      const combined = prev.join(" ").trim();
      if (combined) {
        setTimeout(() => {
          sendMessage(combined);
          setInterimText("");
        }, 0);
      }
      return [];
    });
  }, [sendMessage]);

  const { recording, start: startRecording, stop: stopRecording } = useDeepgramSTT({
    onTranscript: handleFinalTranscript,
    onInterimTranscript: handleInterimTranscript,
    onUtteranceEnd: handleUtteranceEnd,
  });

  // ── Handle mic toggle ──────────────────────────────────────────────────────
  const toggleMic = () => {
    if (recording) {
      const accumulated = finalizedChunks.join(" ").trim();
      stopRecording();
      setInterimText("");
      if (accumulated) {
        sendMessage(accumulated);
      }
      setFinalizedChunks([]);
    } else {
      setFinalizedChunks([]);
      setInterimText("");
      startRecording();
    }
  };

  // ── Handle text submit ─────────────────────────────────────────────────────
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendMessage(textInput.trim());
    setTextInput("");
  };

  // ── Generate packet ────────────────────────────────────────────────────────
  const generatePacket = async () => {
    setGeneratingPacket(true);
    try {
      const res = await fetch("/api/generate-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SESSION_ID }),
      });
      const data = await res.json();
      setPacket(data.packet || "Error generating packet");
    } catch (err) {
      setPacket("Error: " + err.message);
    } finally {
      setGeneratingPacket(false);
    }
  };

  // ── Start interview ────────────────────────────────────────────────────────
  const startInterview = (selectedTrack) => {
    setTrack(selectedTrack);
    setStarted(true);
    // Use setTimeout so track state is set before sendMessage reads it
    setTimeout(() => {
      sendMessage("Hi, I'm ready to get started.");
    }, 0);
  };

  const livePreview = [...finalizedChunks, interimText].filter(Boolean).join(" ");
  const activeTopics = track ? (TOPICS[track] || []) : [];

  // ── RENDER: Welcome / Track Selection ──────────────────────────────────────
  if (!started) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="welcome">
          <div className="welcome-icon">🎙️</div>
          <div className="welcome-badge">Akkio Voice Onboarding</div>
          <h1 className="welcome-title">Let's set up your AI assistant</h1>
          <p className="welcome-sub">
            We're going to have a quick chat to teach your AI assistant about your business and data.
            It's easy — just talk like you normally would. Pick the interview that fits your role.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 380 }}>
            <button className="btn-start" onClick={() => startInterview("executive")} style={{ background: "linear-gradient(135deg, #1860DC, #3B82F6)" }}>
              I'm on the business side (~5 min)
            </button>
            <div style={{ fontSize: 13, color: "#8B9BB4", textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>
              We'll talk about your company, your team, what you want the AI to do, and any rules it should follow. No technical questions.
            </div>
            <button className="btn-start" onClick={() => startInterview("technical")} style={{ background: "linear-gradient(135deg, #00C4A0, #059669)", marginTop: 8 }}>
              I'm on the data side (~7 min)
            </button>
            <div style={{ fontSize: 13, color: "#8B9BB4", textAlign: "center", lineHeight: 1.5, padding: "0 12px" }}>
              We'll go through your tables, columns, calculations, and all the gotchas that make the difference between a right answer and a wrong one.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Interview complete ─────────────────────────────────────────────
  if (interviewComplete && !recording) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="header">
          <span className="header-brand">Akkio Voice</span>
          <span className="header-status">{topicsCovered.length}/{activeTopics.length} covered</span>
        </div>
        <div className="complete-overlay">
          <div className="complete-icon">✅</div>
          <h2 className="complete-title">Interview Complete</h2>
          <p className="complete-sub">
            Great conversation! We covered {topicsCovered.length} of {activeTopics.length} topics.
            Ready to generate your AI context packet.
          </p>
          <button className="btn-generate" onClick={generatePacket} disabled={generatingPacket}>
            {generatingPacket ? <><span className="spinner" />Generating...</> : "Generate Context Packet"}
          </button>
          {packet && (
            <>
              <div className="packet-output">
                <pre>{packet}</pre>
              </div>
              <button
                className="btn-copy"
                onClick={() => { navigator.clipboard.writeText(packet); setCopied(true); }}
              >
                {copied ? "✓ Copied!" : "Copy to Clipboard"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Chat interface ─────────────────────────────────────────────────
  return (
    <div className="app">
      <style>{css}</style>

      <div className="header">
        <span className="header-brand">Akkio Voice</span>
        <span className="header-status">{topicsCovered.length}/{activeTopics.length} topics</span>
      </div>

      <div className="topics-bar">
        {activeTopics.map((t) => (
          <div key={t.id} className={`topic-pill${topicsCovered.includes(t.id) ? " covered" : ""}`}>
            {topicsCovered.includes(t.id) ? "✓" : "○"} {t.label}
          </div>
        ))}
      </div>

      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            {msg.text}
          </div>
        ))}
        {isThinking && (
          <div className="msg thinking">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`live-transcript${livePreview ? "" : " empty"}`}>
        {livePreview && <>🎙️ {livePreview}</>}
      </div>

      <div className="input-area">
        <form onSubmit={handleTextSubmit} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input
            className="text-input"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={recording ? "Listening..." : "Type or tap mic..."}
            disabled={recording || isThinking}
          />
          {textInput.trim() && !recording && (
            <button type="submit" className="send-btn" disabled={isThinking}>
              <SendIcon />
            </button>
          )}
        </form>
        <button
          className={`mic-btn${recording ? " recording" : ""}`}
          onClick={toggleMic}
          disabled={isThinking}
        >
          {recording ? <StopIcon /> : <MicIcon />}
        </button>
      </div>
    </div>
  );
}
