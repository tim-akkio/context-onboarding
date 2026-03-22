import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { BRAND } from "./brand.js";

// ── Topic definitions per track ─────────────────────────────────────────────
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
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; overflow: hidden; }
  body { background: ${BRAND.bg}; }

  .app {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: ${BRAND.bg};
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    color: ${BRAND.text};
    overflow: hidden;
  }

  .akkio-logo { display: flex; align-items: center; gap: 8px; }
  .akkio-logo-diamond { width: 28px; height: 28px; background: ${BRAND.blue}; transform: rotate(45deg); border-radius: 6px; }
  .akkio-logo-text { font-size: 18px; font-weight: 700; color: ${BRAND.dark}; letter-spacing: -0.02em; }

  .interview-header { flex-shrink: 0; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid ${BRAND.border}; }
  .interview-progress { font-size: 13px; font-weight: 500; color: ${BRAND.textLight}; }

  .topics-bar { flex-shrink: 0; display: flex; gap: 6px; padding: 12px 20px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; border-bottom: 1px solid ${BRAND.border}; background: ${BRAND.bgSoft}; }
  .topics-bar::-webkit-scrollbar { display: none; }
  .topic-pill { flex-shrink: 0; display: flex; align-items: center; gap: 4px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: white; color: ${BRAND.textLight}; border: 1px solid ${BRAND.border}; transition: all 0.3s; white-space: nowrap; }
  .topic-pill.covered { background: rgba(16,185,129,0.1); color: ${BRAND.success}; border-color: rgba(16,185,129,0.3); }

  .voice-area { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; gap: 24px; }
  .ai-message { max-width: 360px; text-align: center; font-size: 17px; line-height: 1.6; color: ${BRAND.text}; font-weight: 400; animation: fadeUp 0.3s ease; }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

  .thinking-indicator { display: flex; gap: 6px; align-items: center; }
  .thinking-dot { width: 6px; height: 6px; border-radius: 50%; background: ${BRAND.blue}; animation: bounce 1.4s ease-in-out infinite; }
  .thinking-dot:nth-child(2) { animation-delay: 0.16s; }
  .thinking-dot:nth-child(3) { animation-delay: 0.32s; }
  @keyframes bounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

  .ptt-container { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .ptt-btn { width: 120px; height: 120px; border-radius: 50%; border: none; background: ${BRAND.blue}; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; box-shadow: 0 4px 24px rgba(77,101,255,0.3); }
  .ptt-btn:hover { box-shadow: 0 6px 32px rgba(77,101,255,0.4); transform: scale(1.02); }
  .ptt-btn:active { transform: scale(0.96); }
  .ptt-btn.recording { background: ${BRAND.red}; box-shadow: 0 4px 24px rgba(239,68,68,0.3); animation: pulseRing 2s ease infinite; }
  @keyframes pulseRing { 0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3), 0 4px 24px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 0 16px rgba(239,68,68,0), 0 4px 24px rgba(239,68,68,0.3); } }
  .ptt-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .ptt-label { font-size: 13px; font-weight: 500; color: ${BRAND.textLight}; }

  .live-transcript { max-width: 340px; text-align: center; font-size: 14px; color: ${BRAND.textLight}; font-style: italic; line-height: 1.5; min-height: 21px; transition: opacity 0.2s; }
  .live-transcript.empty { opacity: 0; }

  .text-fallback { flex-shrink: 0; padding: 12px 20px; padding-bottom: max(12px, env(safe-area-inset-bottom)); border-top: 1px solid ${BRAND.border}; display: flex; align-items: center; gap: 10px; background: ${BRAND.bgSoft}; }
  .text-input { flex: 1; background: white; border: 1px solid ${BRAND.border}; border-radius: 24px; padding: 12px 18px; color: ${BRAND.text}; font-family: 'Inter', sans-serif; font-size: 15px; outline: none; transition: border-color 0.2s; }
  .text-input:focus { border-color: ${BRAND.blue}; }
  .text-input::placeholder { color: #c0c5ce; }
  .send-btn { width: 44px; height: 44px; border-radius: 50%; border: none; background: ${BRAND.blue}; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0; }
  .send-btn:active { transform: scale(0.95); }
  .send-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .history-toggle { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; color: ${BRAND.textLight}; background: none; border: none; cursor: pointer; padding: 8px; text-decoration: underline; text-underline-offset: 3px; }
  .history-panel { position: fixed; bottom: 0; left: 0; right: 0; max-height: 60vh; background: white; border-top-left-radius: 20px; border-top-right-radius: 20px; box-shadow: 0 -4px 32px rgba(0,0,0,0.12); overflow-y: auto; padding: 20px; z-index: 100; animation: slideUp 0.3s ease; }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .history-panel .msg { max-width: 85%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.5; margin-bottom: 8px; }
  .history-panel .msg.ai { align-self: flex-start; background: ${BRAND.bgSoft}; color: ${BRAND.text}; }
  .history-panel .msg.user { align-self: flex-end; background: ${BRAND.blue}; color: white; margin-left: auto; }
  .history-close { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; color: ${BRAND.textLight}; background: none; border: none; cursor: pointer; padding: 8px; display: block; margin: 0 auto 12px; }
  .history-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 99; }

  .complete-overlay { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 28px; text-align: center; }
  .complete-icon { width: 64px; height: 64px; border-radius: 50%; background: rgba(16,185,129,0.12); display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; }
  .complete-title { font-size: 24px; font-weight: 700; color: ${BRAND.dark}; margin-bottom: 8px; }
  .complete-sub { font-size: 15px; color: ${BRAND.textLight}; margin-bottom: 28px; max-width: 340px; line-height: 1.5; }
  .btn-generate { font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 14px; cursor: pointer; border: none; background: ${BRAND.blue}; color: white; transition: all 0.15s; margin-bottom: 16px; }
  .btn-generate:hover { background: ${BRAND.blueHover}; }
  .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
  .packet-output { width: 100%; max-width: 600px; max-height: 300px; overflow-y: auto; background: ${BRAND.bgSoft}; border: 1px solid ${BRAND.border}; border-radius: 12px; padding: 16px; margin-top: 12px; text-align: left; }
  .packet-output pre { white-space: pre-wrap; font-family: 'SF Mono', 'Fira Code', monospace; font-size: 12px; color: ${BRAND.text}; line-height: 1.6; }
  .btn-copy { font-family: 'Inter', sans-serif; font-size: 13px; padding: 8px 20px; border-radius: 8px; cursor: pointer; border: 1px solid ${BRAND.border}; background: white; color: ${BRAND.textLight}; transition: all 0.15s; margin-top: 8px; }
  .btn-copy:hover { border-color: ${BRAND.blue}; color: ${BRAND.blue}; }

  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 6px; }
`;

// ── SVG icons ───────────────────────────────────────────────────────────────
const MicIcon = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="1" width="6" height="12" rx="3" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const StopIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Deepgram STT hook ───────────────────────────────────────────────────────
function useDeepgramSTT({ onTranscript, onUtteranceEnd, onInterimTranscript, token }) {
  const wsRef = useRef(null);
  const mediaRef = useRef(null);
  const processorRef = useRef(null);
  const contextRef = useRef(null);
  const [recording, setRecording] = useState(false);

  // Use refs for callbacks to avoid stale closures in WS/audio handlers
  const onTranscriptRef = useRef(onTranscript);
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  onTranscriptRef.current = onTranscript;
  onUtteranceEndRef.current = onUtteranceEnd;
  onInterimTranscriptRef.current = onInterimTranscript;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/transcribe?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "transcript") {
          if (data.isFinal) onTranscriptRef.current?.(data.transcript);
          else onInterimTranscriptRef.current?.(data.transcript);
        } else if (data.type === "utterance_end") {
          onUtteranceEndRef.current?.();
        }
      };

      ws.onerror = (err) => console.error("WS error:", err);
      ws.onclose = () => setRecording(false);

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
  }, [token]);

  const stop = useCallback(() => {
    processorRef.current?.disconnect(); processorRef.current = null;
    contextRef.current?.close(); contextRef.current = null;
    mediaRef.current?.getTracks().forEach((t) => t.stop()); mediaRef.current = null;
    wsRef.current?.close(); wsRef.current = null;
    setRecording(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { recording, start, stop };
}

// ── Interview Component ─────────────────────────────────────────────────────
export default function Interview() {
  const { token, user } = useAuth();
  const track = user?.track;
  const sessionId = user?.sessionId;

  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [finalizedChunks, setFinalizedChunks] = useState([]);
  const [topicsCovered, setTopicsCovered] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(user?.complete || false);
  const [packet, setPacket] = useState("");
  const [generatingPacket, setGeneratingPacket] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [latestAiMessage, setLatestAiMessage] = useState("");
  const [autoStarted, setAutoStarted] = useState(false);

  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ── Send message to interview API ───────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isThinking) return;

    setMessages((prev) => [...prev, { role: "user", text: text.trim() }]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ userMessage: text.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "complete") {
              setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
              setLatestAiMessage(data.reply);
              setTopicsCovered(data.topicsCovered || []);
              if (data.interviewComplete) setInterviewComplete(true);

              if ("speechSynthesis" in window) {
                const utterance = new SpeechSynthesisUtterance(data.reply);
                utterance.rate = 1.05;
                speechSynthesis.speak(utterance);
              }
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error("Send error:", err);
      const errMsg = "Sorry, something went wrong. Please try again.";
      setMessages((prev) => [...prev, { role: "ai", text: errMsg }]);
      setLatestAiMessage(errMsg);
    } finally {
      setIsThinking(false);
    }
  }, [isThinking, token]);

  // Auto-start the interview on first render
  useEffect(() => {
    if (!autoStarted && !interviewComplete) {
      setAutoStarted(true);
      sendMessage("Hi, I'm ready to get started.");
    }
  }, [autoStarted, interviewComplete, sendMessage]);

  // ── Deepgram STT ────────────────────────────────────────────────────────
  const handleFinalTranscript = useCallback((text) => {
    setFinalizedChunks((prev) => [...prev, text]);
  }, []);

  const handleInterimTranscript = useCallback((text) => {
    setInterimText(text);
  }, []);

  const handleUtteranceEnd = useCallback(() => {
    setFinalizedChunks((prev) => {
      const combined = prev.join(" ").trim();
      if (combined) {
        setTimeout(() => { sendMessage(combined); setInterimText(""); }, 0);
      }
      return [];
    });
  }, [sendMessage]);

  const { recording, start: startRecording, stop: stopRecording } = useDeepgramSTT({
    onTranscript: handleFinalTranscript,
    onInterimTranscript: handleInterimTranscript,
    onUtteranceEnd: handleUtteranceEnd,
    token,
  });

  const toggleMic = () => {
    if (recording) {
      const accumulated = finalizedChunks.join(" ").trim();
      stopRecording();
      setInterimText("");
      if (accumulated) sendMessage(accumulated);
      setFinalizedChunks([]);
    } else {
      setFinalizedChunks([]);
      setInterimText("");
      startRecording();
    }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendMessage(textInput.trim());
    setTextInput("");
  };

  const generatePacket = async () => {
    setGeneratingPacket(true);
    try {
      const res = await fetch("/api/generate-packet", {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      setPacket(data.packet || "Error generating packet");
    } catch (err) {
      setPacket("Error: " + err.message);
    } finally {
      setGeneratingPacket(false);
    }
  };

  const livePreview = [...finalizedChunks, interimText].filter(Boolean).join(" ");
  const activeTopics = TOPICS[track] || [];

  // ── RENDER: Interview complete ─────────────────────────────────────────
  if (interviewComplete && !recording) {
    return (
      <div className="app">
        <style>{css}</style>
        <div className="interview-header">
          <div className="akkio-logo">
            <div className="akkio-logo-diamond" style={{ width: 20, height: 20, borderRadius: 4 }} />
            <span className="akkio-logo-text" style={{ fontSize: 15 }}>Akkio</span>
          </div>
          <span className="interview-progress">{topicsCovered.length}/{activeTopics.length} covered</span>
        </div>
        <div className="complete-overlay">
          <div className="complete-icon">✓</div>
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
              <div className="packet-output"><pre>{packet}</pre></div>
              <button className="btn-copy" onClick={() => { navigator.clipboard.writeText(packet); setCopied(true); }}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Voice-centered interview ───────────────────────────────────
  return (
    <div className="app">
      <style>{css}</style>

      <div className="interview-header">
        <div className="akkio-logo">
          <div className="akkio-logo-diamond" style={{ width: 20, height: 20, borderRadius: 4 }} />
          <span className="akkio-logo-text" style={{ fontSize: 15 }}>Akkio</span>
        </div>
        <span className="interview-progress">{topicsCovered.length}/{activeTopics.length} topics</span>
      </div>

      <div className="topics-bar">
        {activeTopics.map((t) => (
          <div key={t.id} className={`topic-pill${topicsCovered.includes(t.id) ? " covered" : ""}`}>
            {topicsCovered.includes(t.id) ? "✓" : "○"} {t.label}
          </div>
        ))}
      </div>

      <div className="voice-area">
        {isThinking ? (
          <div className="thinking-indicator">
            <div className="thinking-dot" />
            <div className="thinking-dot" />
            <div className="thinking-dot" />
          </div>
        ) : latestAiMessage ? (
          <div className="ai-message" key={latestAiMessage.slice(0, 40)}>{latestAiMessage}</div>
        ) : null}

        <div className="ptt-container">
          <button className={`ptt-btn${recording ? " recording" : ""}`} onClick={toggleMic} disabled={isThinking}>
            {recording ? <StopIcon /> : <MicIcon />}
          </button>
          <span className="ptt-label">
            {recording ? "Tap to stop" : isThinking ? "Thinking..." : "Tap to speak"}
          </span>
        </div>

        <div className={`live-transcript${livePreview ? "" : " empty"}`}>{livePreview}</div>

        {messages.length > 0 && (
          <button className="history-toggle" onClick={() => setShowHistory(true)}>
            View conversation ({messages.length} messages)
          </button>
        )}
      </div>

      <div className="text-fallback">
        <form onSubmit={handleTextSubmit} style={{ flex: 1, display: "flex", gap: 8 }}>
          <input className="text-input" value={textInput} onChange={(e) => setTextInput(e.target.value)}
            placeholder={recording ? "Listening..." : "Or type here..."} disabled={recording || isThinking} />
          {textInput.trim() && !recording && (
            <button type="submit" className="send-btn" disabled={isThinking}><SendIcon /></button>
          )}
        </form>
      </div>

      {showHistory && (
        <>
          <div className="history-backdrop" onClick={() => setShowHistory(false)} />
          <div className="history-panel">
            <button className="history-close" onClick={() => setShowHistory(false)}>Close</button>
            {messages.map((msg, i) => (
              <div key={i} className={`msg ${msg.role}`}>{msg.text}</div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
