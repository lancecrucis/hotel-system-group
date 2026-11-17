import { env } from '../../../config/env.js';

// In development: log to console. Wire real providers via env vars.

function devLink(kind: string, link: string) {
  if (env.NODE_ENV !== 'production') {
    console.log(`[EMAIL] ${kind}:`, link);
  }
}

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html: string;
}

async function send(payload: EmailPayload) {
  const provider = env.EMAIL_PROVIDER;
  if (!provider || provider === 'console') {
    devLink(payload.subject, payload.text.split('\n').find((l) => l.startsWith('http')) ?? '');
    return;
  }
  // Future: SMTP, SendGrid, etc.
  throw new Error(`Email provider '${provider}' is not yet implemented.`);
}

export function sendVerificationEmail(email: string, token: string) {
  const link = `${env.CLIENT_ORIGIN}/verify-email?token=${token}`;
  return send({
    to: email,
    subject: 'Verify your email',
    text: `Verify your email: ${link}`,
    html: `<p><a href="${link}">Verify your email</a></p>`,
  });
}

export function sendPasswordResetEmail(email: string, token: string) {
  const link = `${env.CLIENT_ORIGIN}/reset-password?token=${token}`;
  return send({
    to: email,
    subject: 'Reset your password',
    text: `Reset your password: ${link}\nThis link expires in 15 minutes.`,
    html: `<p>Reset your password: <a href="${link}">click here</a></p><p>Expires in 15 minutes.</p>`,
  });
}

export function rateLimitRecent(email: string) {
  // Rate-limit checks happen in the route handlers via DB queries.
  // This signature is a placeholder for future email-provider-level rate limiting.
  void email;
}