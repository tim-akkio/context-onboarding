/**
 * server/email.js
 *
 * Email sending for invitation links.
 * Falls back to console logging if SMTP is not configured.
 */

import nodemailer from "nodemailer";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

let transporter = null;

export function initEmail() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || "465"),
      secure: parseInt(port || "465") === 465,
      auth: { user, pass },
    });
    console.log(`Email configured via ${host}`);
  } else {
    console.log("SMTP not configured — invitation URLs will be logged to console");
  }
}

export async function sendInvitationEmail({ to, clientName, track, token, recipientName }) {
  const inviteUrl = `${APP_URL}/i/${token}`;
  const trackLabel = track === "executive" ? "Business & Strategy" : "Data & Technical";
  const duration = track === "executive" ? "~5 minutes" : "~7 minutes";
  const displayName = recipientName || to.split("@")[0];

  if (!transporter) {
    console.log(`\n📧 INVITATION (${track}) for ${to}:`);
    console.log(`   ${inviteUrl}\n`);
    return { success: true, method: "console" };
  }

  const safeName = escapeHtml(displayName);
  const safeClient = escapeHtml(clientName);

  const html = `
    <div style="font-family: Inter, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px;">
      <div style="margin-bottom: 32px;">
        <div style="display: inline-block; width: 24px; height: 24px; background: #4d65ff; transform: rotate(45deg); border-radius: 5px; vertical-align: middle;"></div>
        <span style="font-size: 18px; font-weight: 700; color: #1a1a2e; margin-left: 10px; vertical-align: middle;">Akkio</span>
      </div>

      <h1 style="font-size: 22px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px;">
        Hi ${safeName},
      </h1>

      <p style="font-size: 15px; color: #2d2d3a; line-height: 1.7; margin-bottom: 8px;">
        You've been invited to a quick onboarding conversation for <strong>${safeClient}</strong>.
        This helps us set up your AI assistant to understand your ${track === "executive" ? "business context and goals" : "data, tables, and technical specifics"}.
      </p>

      <p style="font-size: 15px; color: #6b7280; line-height: 1.7; margin-bottom: 28px;">
        <strong>${trackLabel}</strong> interview &middot; ${duration} &middot; Just talk naturally
      </p>

      <a href="${inviteUrl}"
         style="display: inline-block; background: #4d65ff; color: white; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
        Start Your Interview
      </a>

      <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; line-height: 1.6;">
        This link is unique to you. You can come back to it anytime if you need to pause and resume.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "Akkio Onboarding <onboarding@akkio.com>",
    to,
    subject: `${safeClient} — Akkio AI Onboarding (${trackLabel})`,
    html,
  });

  return { success: true, method: "email" };
}
