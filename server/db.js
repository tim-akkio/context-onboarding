/**
 * server/db.js
 *
 * SQLite database layer using better-sqlite3.
 * All data persists to data/onboarding.db.
 */

import Database from "better-sqlite3";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(__dirname, "..", "data");
const DB_PATH = path.join(DB_DIR, "onboarding.db");

let db;

export function initDb() {
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invitations (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      name TEXT,
      track TEXT NOT NULL CHECK(track IN ('executive', 'technical')),
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited', 'started', 'completed')),
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT DEFAULT (datetime('now', '+30 days')),
      last_sent_at TEXT,
      UNIQUE(client_id, email)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      invitation_id TEXT NOT NULL REFERENCES invitations(id),
      track TEXT NOT NULL,
      messages TEXT NOT NULL DEFAULT '[]',
      facts TEXT NOT NULL DEFAULT '{}',
      topics_covered TEXT NOT NULL DEFAULT '[]',
      complete INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS packets (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      session_id TEXT REFERENCES sessions(id),
      content TEXT NOT NULL,
      track TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function uid() {
  return crypto.randomBytes(16).toString("hex");
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Clients ─────────────────────────────────────────────────────────────────

export function createClient(name) {
  const id = uid();
  const slug = slugify(name);
  db.prepare("INSERT INTO clients (id, name, slug) VALUES (?, ?, ?)").run(id, name, slug);
  return getClient(id);
}

export function getClient(id) {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
}

export function getClientBySlug(slug) {
  return db.prepare("SELECT * FROM clients WHERE slug = ?").get(slug);
}

export function listClients() {
  return db.prepare(`
    SELECT c.*,
      COUNT(i.id) as invitation_count,
      SUM(CASE WHEN i.status = 'invited' THEN 1 ELSE 0 END) as invited_count,
      SUM(CASE WHEN i.status = 'started' THEN 1 ELSE 0 END) as started_count,
      SUM(CASE WHEN i.status = 'completed' THEN 1 ELSE 0 END) as completed_count
    FROM clients c
    LEFT JOIN invitations i ON c.id = i.client_id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
}

export function deleteClient(id) {
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
}

// ── Invitations ─────────────────────────────────────────────────────────────

export function createInvitation(clientId, email, track, name = null) {
  const id = uid();
  const token = crypto.randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO invitations (id, client_id, email, name, track, token) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, clientId, email, name, track, token);
  return getInvitation(id);
}

export function getInvitation(id) {
  return db.prepare("SELECT * FROM invitations WHERE id = ?").get(id);
}

export function getInvitationByToken(token) {
  return db.prepare(`
    SELECT i.*, c.name as client_name, c.slug as client_slug
    FROM invitations i
    JOIN clients c ON i.client_id = c.id
    WHERE i.token = ? AND (i.expires_at IS NULL OR i.expires_at > datetime('now'))
  `).get(token);
}

export function getInvitationsByClient(clientId) {
  return db.prepare(`
    SELECT i.*, s.id as session_id
    FROM invitations i
    LEFT JOIN sessions s ON i.id = s.invitation_id
    WHERE i.client_id = ?
    ORDER BY i.created_at DESC
  `).all(clientId);
}

export function updateInvitationStatus(id, status) {
  db.prepare("UPDATE invitations SET status = ? WHERE id = ?").run(status, id);
}

export function updateInvitationSentAt(id) {
  db.prepare("UPDATE invitations SET last_sent_at = datetime('now') WHERE id = ?").run(id);
}

// ── Sessions ────────────────────────────────────────────────────────────────

export function createSession(invitationId, track) {
  const id = uid();
  db.prepare("INSERT INTO sessions (id, invitation_id, track) VALUES (?, ?, ?)").run(id, invitationId, track);
  return getSession(id);
}

export function getSession(id) {
  const row = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  if (!row) return null;
  return {
    ...row,
    messages: JSON.parse(row.messages),
    facts: JSON.parse(row.facts),
    topicsCovered: JSON.parse(row.topics_covered),
    complete: !!row.complete,
  };
}

export function getSessionByInvitation(invitationId) {
  const row = db.prepare("SELECT * FROM sessions WHERE invitation_id = ?").get(invitationId);
  if (!row) return null;
  return {
    ...row,
    messages: JSON.parse(row.messages),
    facts: JSON.parse(row.facts),
    topicsCovered: JSON.parse(row.topics_covered),
    complete: !!row.complete,
  };
}

export function updateSession(id, { messages, facts, topicsCovered, complete }) {
  db.prepare(`
    UPDATE sessions SET
      messages = ?,
      facts = ?,
      topics_covered = ?,
      complete = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    JSON.stringify(messages),
    JSON.stringify(facts),
    JSON.stringify(topicsCovered),
    complete ? 1 : 0,
    id,
  );
}

// ── Packets ─────────────────────────────────────────────────────────────────

export function savePacket(clientId, content, { sessionId = null, track = null } = {}) {
  const id = uid();
  db.prepare(
    "INSERT INTO packets (id, client_id, session_id, content, track) VALUES (?, ?, ?, ?, ?)"
  ).run(id, clientId, content, sessionId, track);
  return getPacket(id);
}

export function getPacket(id) {
  return db.prepare("SELECT * FROM packets WHERE id = ?").get(id);
}

export function getPacketsForClient(clientId) {
  return db.prepare("SELECT * FROM packets WHERE client_id = ? ORDER BY created_at DESC").all(clientId);
}

// ── Admin Users ─────────────────────────────────────────────────────────────

export function createAdminUser(email, passwordHash) {
  const id = uid();
  db.prepare("INSERT INTO admin_users (id, email, password_hash) VALUES (?, ?, ?)").run(id, email, passwordHash);
  return { id, email };
}

export function getAdminByEmail(email) {
  return db.prepare("SELECT * FROM admin_users WHERE email = ?").get(email);
}

export function adminCount() {
  return db.prepare("SELECT COUNT(*) as count FROM admin_users").get().count;
}
