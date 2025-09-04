// src/lib/mailer.ts
// Sends email via Resend. STRICT: sender must be on galeahub.online.
// Reads INVITES_FROM first, then MAIL_FROM. Returns provider message id for debugging.

export type MailResult =
  | { ok: true; providerId?: string; fromUsed: string; to: string }
  | { ok: false; error: string; fromUsed: string; to: string };

type SendInviteArgs = {
  to: string;
  acceptUrl: string;
  inviterName?: string | null;
  householdName?: string | null;
};

const REQUIRED_DOMAIN = 'galeahub.online';

export async function sendInviteEmail({
  to,
  acceptUrl,
  inviterName,
  householdName,
}: SendInviteArgs): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromHeader = (process.env.INVITES_FROM || process.env.MAIL_FROM || '').trim();
  const replyTo = (process.env.INVITES_REPLY_TO || '').trim();

  if (!to) return { ok: false, error: 'Missing recipient email', fromUsed: fromHeader, to: '' };
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set', fromUsed: fromHeader, to };

  const fromEmail = extractEmail(fromHeader);
  if (!fromHeader || !fromEmail) {
    return {
      ok: false,
      error: 'INVITES_FROM/MAIL_FROM not set or invalid. E.g. Houseflow <no-reply@galeahub.online>',
      fromUsed: fromHeader,
      to,
    };
  }
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (domain !== REQUIRED_DOMAIN) {
    return {
      ok: false,
      error: `Sender must use ${REQUIRED_DOMAIN} (got ${domain || 'unknown'}). Update INVITES_FROM.`,
      fromUsed: fromHeader,
      to,
    };
  }

  const subject = `Invitation to join your household on Houseflow`;
  const text = [
    `${inviterName || 'Someone'} invited you to join ${householdName || 'a household'} on Houseflow.`,
    '',
    `Accept: ${acceptUrl}`,
    '',
    `If you didn’t expect this, you can ignore this email.`,
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#111; max-width:560px; margin:auto; padding:16px">
      <h2 style="margin:0 0 8px">Houseflow invite</h2>
      <p style="margin:0 0 12px">${escapeHtml(inviterName || 'Someone')} invited you to join <b>${escapeHtml(
        householdName || 'a household'
      )}</b> on Houseflow.</p>
      <p style="margin:0 0 16px">Click the button below to accept:</p>
      <p style="margin:0 0 24px">
        <a href="${acceptUrl}" style="background:#a21caf;color:#fff;text-decoration:none;padding:10px 14px;border-radius:12px;display:inline-block">
          Accept invite
        </a>
      </p>
      <p style="margin:0;color:#555;font-size:12px">If the button doesn’t work, paste this link in your browser:</p>
      <p style="word-break:break-all;font-size:12px;color:#555">${acceptUrl}</p>
    </div>
  `;

  try {
    const payload: any = {
      from: fromHeader,
      to,
      subject,
      text,
      html,
      headers: { 'Auto-Submitted': 'auto-generated' },
    };
    if (replyTo) payload.reply_to = replyTo;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await r.json() : await r.text();

    if (!r.ok) {
      const msg =
        typeof body === 'string'
          ? body
          : body?.error || body?.message || JSON.stringify(body || {});
      return { ok: false, error: `Resend ${r.status}: ${msg}`, fromUsed: fromHeader, to };
    }

    const providerId = typeof body === 'object' ? body?.id : undefined;
    return { ok: true, providerId, fromUsed: fromHeader, to };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e), fromUsed: fromHeader, to };
  }
}

function extractEmail(fromHeader: string): string | null {
  const angle = /<([^>]+)>/.exec(fromHeader);
  if (angle && angle[1]) return angle[1].trim();
  if (/^[^@\s]+@[^@\s]+$/.test(fromHeader)) return fromHeader;
  return null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[ch]
  );
}
