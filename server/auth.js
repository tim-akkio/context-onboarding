/**
 * server/auth.js
 *
 * JWT-based authentication for admin users and invited interviewees.
 */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET environment variable is required. Set it in .env");
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

// ── Token helpers ───────────────────────────────────────────────────────────

export function signToken(payload, expiresIn = "7d") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function checkPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// ── Middleware ───────────────────────────────────────────────────────────────

function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return req.cookies?.token || null;
}

export function requireAdmin(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = verifyToken(token);
    if (payload.role !== "admin") return res.status(403).json({ error: "Admin access required" });
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireInvitation(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const payload = verifyToken(token);
    if (payload.role !== "interviewee") return res.status(403).json({ error: "Invalid role" });
    req.interviewee = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
