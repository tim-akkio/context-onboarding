import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { BRAND } from "../brand.js";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      login(data.token);
      navigate("/admin", { replace: true });
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: BRAND.bgSoft }}>
      <form onSubmit={handleSubmit} style={{ background: "white", padding: 40, borderRadius: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", width: 380, maxWidth: "90vw" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
          <div style={{ width: 24, height: 24, background: BRAND.blue, transform: "rotate(45deg)", borderRadius: 5 }} />
          <span style={{ fontSize: 18, fontWeight: 700, color: BRAND.dark }}>Akkio Admin</span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: BRAND.textLight, marginBottom: 6 }}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${BRAND.border}`, borderRadius: 8, fontSize: 15, fontFamily: "Inter, sans-serif", outline: "none" }} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: BRAND.textLight, marginBottom: 6 }}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            style={{ width: "100%", padding: "10px 14px", border: `1px solid ${BRAND.border}`, borderRadius: 8, fontSize: 15, fontFamily: "Inter, sans-serif", outline: "none" }} />
        </div>

        {error && <p style={{ color: BRAND.red, fontSize: 13, marginBottom: 16 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          width: "100%", padding: "12px", background: BRAND.blue, color: "white", border: "none",
          borderRadius: 10, fontSize: 15, fontWeight: 600, fontFamily: "Inter, sans-serif", cursor: "pointer",
          opacity: loading ? 0.6 : 1,
        }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
