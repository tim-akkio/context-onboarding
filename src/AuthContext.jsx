import { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

function decodeJWT(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload?.exp) return false;
  return Date.now() >= payload.exp * 1000;
}

function getValidToken() {
  const t = localStorage.getItem("token");
  if (t && isTokenExpired(t)) {
    localStorage.removeItem("token");
    return null;
  }
  return t;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getValidToken());
  const [user, setUser] = useState(() => {
    const t = getValidToken();
    return t ? decodeJWT(t) : null;
  });

  const login = useCallback((newToken, extra = {}) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    const payload = decodeJWT(newToken);
    setUser({ ...payload, ...extra });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAdmin: user?.role === "admin", isInterviewee: user?.role === "interviewee" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
