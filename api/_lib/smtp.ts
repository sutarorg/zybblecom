import nodemailer from "nodemailer";

// ————————————————————————————————————————————————————————————
// Real SMTP delivery via nodemailer, running inside the app's
// Node serverless runtime. Credentials are decrypted in-process,
// used, and dropped — never logged, never returned to a client.
// ————————————————————————————————————————————————————————————

export interface SmtpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

function transporterFor(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.port === 465,
    auth: { user: creds.username, pass: creds.password },
    connectionTimeout: 10_000,
    greetingTimeout: 8_000,
    socketTimeout: 20_000,
  });
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
  msg: { id: string; from: string; to: string; subject: string; text: string; unsubscribeUrl: string }
): Promise<SendOutcome> {
  const t = transporterFor(creds);
  try {
    await t.sendMail({
      from: msg.from,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      // Stable across retries so an ambiguous connection loss cannot
      // produce a visible duplicate in the recipient's mailbox.
      messageId: `<zybble-${msg.id}@zybble.email>`,
      headers: {
        "List-Unsubscribe": `<${msg.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
    return { ok: true, hardBounce: false };
  } catch (err) {
    const e = err as { responseCode?: number; message?: string };
    const status = e.responseCode ?? 0;
    // 5xx = permanent rejection (mailbox does not exist) → bounce.
    return {
      ok: false,
      hardBounce: status >= 500 && status < 600,
      error: e.message?.slice(0, 180) ?? "SMTP send failed",
    };
  } finally {
    t.close();
  }
}
