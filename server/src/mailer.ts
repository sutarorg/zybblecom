import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

// ————————————————————————————————————————————————————————————
// SMTP delivery via nodemailer. Credentials are only ever
// decrypted in-process, used, and dropped — never logged.
// ————————————————————————————————————————————————————————————

export interface SmtpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export function transporterFor(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.port === 465,
    auth: { user: creds.username, pass: creds.password },
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
  } satisfies SMTPTransport.Options);
}

/** Live handshake — surfaces real auth/connection errors to the user. */
export async function verifySmtp(creds: SmtpCredentials): Promise<void> {
  const t = transporterFor(creds);
  try {
    await t.verify();
  } finally {
    t.close();
  }
}

export interface SendOutcome {
  ok: boolean;
  hardBounce: boolean;
  error?: string;
}

export async function sendEmail(
  creds: SmtpCredentials,
  msg: { from: string; to: string; subject: string; text: string }
): Promise<SendOutcome> {
  const t = transporterFor(creds);
  try {
    await t.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      headers: { "X-Entity-Ref-ID": `zybble-${Date.now()}` },
    });
    return { ok: true, hardBounce: false };
  } catch (err) {
    const e = err as { responseCode?: number; code?: string; message?: string };
    const status = e.responseCode ?? 0;
    // 5xx = permanent failure (mailbox doesn't exist, rejected) → bounce.
    const hardBounce = status >= 500 && status < 600;
    return {
      ok: false,
      hardBounce,
      error: e.message?.slice(0, 180) ?? "SMTP send failed",
    };
  } finally {
    t.close();
  }
}
