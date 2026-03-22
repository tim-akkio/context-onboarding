import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../AuthContext.jsx";
import { BRAND } from "../brand.js";

// ── Shared styles ───────────────────────────────────────────────────────────
const S = {
  page: { fontFamily: "'Inter', sans-serif", minHeight: "100vh", background: BRAND.bgSoft, color: BRAND.text },
  header: { background: "white", borderBottom: `1px solid ${BRAND.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  diamond: { width: 20, height: 20, background: BRAND.blue, transform: "rotate(45deg)", borderRadius: 4 },
  logoText: { fontSize: 16, fontWeight: 700, color: BRAND.dark },
  content: { maxWidth: 960, margin: "0 auto", padding: 24 },
  card: { background: "white", borderRadius: 12, border: `1px solid ${BRAND.border}`, marginBottom: 16, overflow: "hidden" },
  cardHeader: { padding: "16px 20px", borderBottom: `1px solid ${BRAND.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardBody: { padding: 20 },
  btn: { fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "none", transition: "all 0.15s" },
  btnPrimary: { background: BRAND.blue, color: "white" },
  btnOutline: { background: "transparent", color: BRAND.blue, border: `1px solid ${BRAND.blue}` },
  btnSmall: { fontSize: 12, padding: "5px 10px", borderRadius: 6 },
  btnDanger: { background: "transparent", color: BRAND.red, border: `1px solid ${BRAND.red}` },
  input: { width: "100%", padding: "8px 12px", border: `1px solid ${BRAND.border}`, borderRadius: 8, fontSize: 14, fontFamily: "Inter, sans-serif", outline: "none" },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: BRAND.textLight, marginBottom: 4 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: "10px 12px", borderBottom: `1px solid ${BRAND.border}`, color: BRAND.textLight, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "10px 12px", borderBottom: `1px solid ${BRAND.border}` },
  pill: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: `${color}18`, color }),
};

function useApi() {
  const { token, logout } = useAuth();
  return useCallback(async (url, opts = {}) => {
    const res = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts.headers },
    });
    if (res.status === 401) {
      logout();
      throw new Error("Session expired. Please log in again.");
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return res.json();
  }, [token, logout]);
}

// ── Status pill color ───────────────────────────────────────────────────────
const statusColor = { invited: BRAND.orange, started: BRAND.blue, completed: BRAND.success };

// ── Admin Dashboard ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const api = useApi();
  const [view, setView] = useState("clients"); // "clients" | "detail"
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [inviteRows, setInviteRows] = useState([{ email: "", name: "", track: "executive" }]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [transcript, setTranscript] = useState(null);
  const [exporting, setExporting] = useState(false);

  const loadClients = useCallback(async () => {
    const data = await api("/api/admin/clients");
    setClients(data);
  }, [api]);

  const loadClient = useCallback(async (id) => {
    const data = await api(`/api/admin/clients/${id}`);
    setSelectedClient(data);
    setView("detail");
  }, [api]);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ── Create client ─────────────────────────────────────────────────────────
  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    await api("/api/admin/clients", { method: "POST", body: JSON.stringify({ name: newClientName }) });
    setNewClientName("");
    setShowNewClient(false);
    loadClients();
  };

  // ── Send invitations ──────────────────────────────────────────────────────
  const handleSendInvites = async () => {
    const valid = inviteRows.filter((r) => r.email.trim());
    if (valid.length === 0) return;
    await api(`/api/admin/clients/${selectedClient.id}/invitations`, {
      method: "POST",
      body: JSON.stringify({ invitations: valid }),
    });
    setInviteRows([{ email: "", name: "", track: "executive" }]);
    setShowInviteForm(false);
    loadClient(selectedClient.id);
  };

  const handleResend = async (invId) => {
    await api(`/api/admin/invitations/${invId}/resend`, { method: "POST" });
    loadClient(selectedClient.id);
  };

  const handleViewTranscript = async (sessionId) => {
    const data = await api(`/api/admin/sessions/${sessionId}`);
    setTranscript(data);
  };

  const handleExportSession = async (sessionId) => {
    setExporting(true);
    const data = await api(`/api/admin/sessions/${sessionId}/export`, { method: "POST" });
    // Trigger download
    const blob = new Blob([data.packet], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  const handleExportCombined = async () => {
    setExporting(true);
    const data = await api(`/api/admin/clients/${selectedClient.id}/export`, { method: "POST" });
    const blob = new Blob([data.packet], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = data.filename;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    loadClient(selectedClient.id);
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = () => (
    <div style={S.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={S.logo}>
          <div style={S.diamond} />
          <span style={S.logoText}>Akkio Onboarding</span>
        </div>
        {view === "detail" && (
          <button onClick={() => { setView("clients"); setTranscript(null); }} style={{ ...S.btn, ...S.btnOutline, ...S.btnSmall }}>
            ← Back
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: BRAND.textLight }}>{user?.email}</span>
        <button onClick={logout} style={{ ...S.btn, ...S.btnSmall, background: BRAND.bgSoft, color: BRAND.textLight }}>Sign out</button>
      </div>
    </div>
  );

  // ── RENDER: Transcript viewer ─────────────────────────────────────────────
  if (transcript) {
    return (
      <div style={S.page}>
        <Header />
        <div style={S.content}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: BRAND.dark }}>Interview Transcript</h2>
            <button onClick={() => setTranscript(null)} style={{ ...S.btn, ...S.btnOutline, ...S.btnSmall }}>Close</button>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
            <span style={S.pill(BRAND.blue)}>{transcript.track}</span>
            <span style={{ fontSize: 13, color: BRAND.textLight }}>{transcript.messages?.length || 0} messages</span>
            <span style={{ fontSize: 13, color: BRAND.textLight }}>{transcript.topicsCovered?.length || 0} topics covered</span>
          </div>

          <div style={S.card}>
            <div style={S.cardBody}>
              {transcript.messages?.map((msg, i) => (
                <div key={i} style={{ marginBottom: 16, display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: msg.role === "user" ? BRAND.blue : BRAND.success, textTransform: "uppercase", marginBottom: 4 }}>
                    {msg.role === "user" ? "Interviewee" : "AI"}
                  </span>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: BRAND.text }}>{msg.content}</p>
                </div>
              ))}
            </div>
          </div>

          {transcript.facts && Object.keys(transcript.facts).length > 0 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Extracted Facts</h3>
              </div>
              <div style={S.cardBody}>
                <pre style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "'SF Mono', monospace" }}>
                  {JSON.stringify(transcript.facts, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: Client detail ─────────────────────────────────────────────────
  if (view === "detail" && selectedClient) {
    const invitations = selectedClient.invitations || [];
    const completedCount = invitations.filter((i) => i.status === "completed" || i.session_id).length;

    return (
      <div style={S.page}>
        <Header />
        <div style={S.content}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: BRAND.dark }}>{selectedClient.name}</h2>
              <span style={{ fontSize: 13, color: BRAND.textLight }}>{invitations.length} invited · {completedCount} completed</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowInviteForm(!showInviteForm)} style={{ ...S.btn, ...S.btnPrimary }}>
                + Add People
              </button>
              {completedCount > 0 && (
                <button onClick={handleExportCombined} disabled={exporting} style={{ ...S.btn, ...S.btnOutline }}>
                  {exporting ? "Exporting..." : "Export Combined Packet"}
                </button>
              )}
            </div>
          </div>

          {/* Invite form */}
          {showInviteForm && (
            <div style={{ ...S.card, marginBottom: 20 }}>
              <div style={S.cardHeader}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Send Invitations</h3>
              </div>
              <div style={S.cardBody}>
                {inviteRows.map((row, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input placeholder="Email" value={row.email} onChange={(e) => {
                      const next = [...inviteRows]; next[i].email = e.target.value; setInviteRows(next);
                    }} style={{ ...S.input, flex: 2 }} />
                    <input placeholder="Name (optional)" value={row.name} onChange={(e) => {
                      const next = [...inviteRows]; next[i].name = e.target.value; setInviteRows(next);
                    }} style={{ ...S.input, flex: 1 }} />
                    <select value={row.track} onChange={(e) => {
                      const next = [...inviteRows]; next[i].track = e.target.value; setInviteRows(next);
                    }} style={{ ...S.input, flex: 0, width: 130 }}>
                      <option value="executive">Executive</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={() => setInviteRows([...inviteRows, { email: "", name: "", track: "executive" }])}
                    style={{ ...S.btn, ...S.btnOutline, ...S.btnSmall }}>+ Add row</button>
                  <button onClick={handleSendInvites} style={{ ...S.btn, ...S.btnPrimary, ...S.btnSmall }}>Send Invitations</button>
                </div>
              </div>
            </div>
          )}

          {/* Invitations table */}
          <div style={S.card}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Person</th>
                  <th style={S.th}>Track</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Sent</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 500 }}>{inv.name || "—"}</div>
                      <div style={{ fontSize: 12, color: BRAND.textLight }}>{inv.email}</div>
                    </td>
                    <td style={S.td}><span style={S.pill(BRAND.blue)}>{inv.track}</span></td>
                    <td style={S.td}><span style={S.pill(statusColor[inv.status] || BRAND.textLight)}>{inv.status}</span></td>
                    <td style={S.td}>
                      <span style={{ fontSize: 12, color: BRAND.textLight }}>
                        {inv.last_sent_at ? new Date(inv.last_sent_at).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {inv.status === "invited" && (
                          <button onClick={() => handleResend(inv.id)} style={{ ...S.btn, ...S.btnOutline, ...S.btnSmall }}>Resend</button>
                        )}
                        {inv.session_id && (
                          <>
                            <button onClick={() => handleViewTranscript(inv.session_id)} style={{ ...S.btn, ...S.btnOutline, ...S.btnSmall }}>Transcript</button>
                            <button onClick={() => handleExportSession(inv.session_id)} disabled={exporting} style={{ ...S.btn, ...S.btnSmall, background: BRAND.bgSoft, color: BRAND.text }}>Export</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {invitations.length === 0 && (
                  <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: BRAND.textLight, padding: 32 }}>No invitations yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: Client list ───────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <Header />
      <div style={S.content}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: BRAND.dark }}>Clients</h2>
          <button onClick={() => setShowNewClient(!showNewClient)} style={{ ...S.btn, ...S.btnPrimary }}>
            + New Client
          </button>
        </div>

        {showNewClient && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={S.cardBody}>
              <div style={{ display: "flex", gap: 8 }}>
                <input placeholder="Client name (e.g. Acme Corp)" value={newClientName} onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateClient()} style={{ ...S.input, flex: 1 }} />
                <button onClick={handleCreateClient} style={{ ...S.btn, ...S.btnPrimary }}>Create</button>
              </div>
            </div>
          </div>
        )}

        <div style={S.card}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Client</th>
                <th style={S.th}>Invited</th>
                <th style={S.th}>Started</th>
                <th style={S.th}>Completed</th>
                <th style={S.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} onClick={() => loadClient(c.id)} style={{ cursor: "pointer" }}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{c.name}</td>
                  <td style={S.td}>{c.invited_count || 0}</td>
                  <td style={S.td}>{c.started_count || 0}</td>
                  <td style={S.td}>{c.completed_count || 0}</td>
                  <td style={{ ...S.td, color: BRAND.textLight, fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr><td colSpan={5} style={{ ...S.td, textAlign: "center", color: BRAND.textLight, padding: 32 }}>No clients yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
