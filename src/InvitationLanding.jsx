import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { BRAND } from "./brand.js";

export default function InvitationLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/auth/invitation/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid invitation link");
          setLoading(false);
          return;
        }

        login(data.token, {
          sessionId: data.sessionId,
          track: data.track,
          clientName: data.clientName,
          complete: data.complete,
          name: data.name,
        });

        navigate("/interview", { replace: true });
      } catch (err) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
      }
    })();
  }, [token, login, navigate]);

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      textAlign: "center",
      background: "white",
    }}>
      {loading && !error && (
        <>
          <div style={{ width: 28, height: 28, background: BRAND.blue, transform: "rotate(45deg)", borderRadius: 6, marginBottom: 24 }} />
          <p style={{ color: BRAND.textLight, fontSize: 16 }}>Setting up your interview...</p>
        </>
      )}
      {error && (
        <>
          <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
          <h2 style={{ color: BRAND.dark, fontSize: 20, marginBottom: 8 }}>Invalid Link</h2>
          <p style={{ color: BRAND.textLight, fontSize: 15, maxWidth: 340 }}>{error}</p>
        </>
      )}
    </div>
  );
}
