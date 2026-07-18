// src/lib/mailer.ts
// Sends email via Resend. STRICT: sender must be on the configured verified domain.
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

export async function sendInviteEmail({
  to,
  acceptUrl,
  inviterName,
  householdName,
}: SendInviteArgs): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromHeader = (process.env.INVITES_FROM || process.env.MAIL_FROM || '').trim();
  const requiredDomain = (process.env.INVITES_FROM_DOMAIN || 'clankeep.com').trim().toLowerCase();
  const replyTo = (process.env.INVITES_REPLY_TO || '').trim();

  if (!to) return { ok: false, error: 'Missing recipient email', fromUsed: fromHeader, to: '' };
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set', fromUsed: fromHeader, to };

  const fromEmail = extractEmail(fromHeader);
  if (!fromHeader || !fromEmail) {
    return {
      ok: false,
      error: 'INVITES_FROM/MAIL_FROM not set or invalid. E.g. Clankeep <noreply@clankeep.com>',
      fromUsed: fromHeader,
      to,
    };
  }
  const domain = fromEmail.split('@')[1]?.toLowerCase();
  if (domain !== requiredDomain) {
    return {
      ok: false,
      error: `Sender must use ${requiredDomain} (got ${domain || 'unknown'}). Update INVITES_FROM.`,
      fromUsed: fromHeader,
      to,
    };
  }

  const subject = `You're invited to join ${householdName || 'a household'} on Clankeep`;
  const safeAcceptUrl = escapeHtml(acceptUrl);
const text = [
    `Hello!`,
    '',
    `${inviterName || 'Someone'} has invited you to join ${householdName || 'a household'} on Clankeep - a cozy app for managing your household together.`,
    '',
    `Clankeep helps families organize shopping lists, track children's medicine, manage finances, and stay connected with everything that makes your house a home.`,
    '',
    `Accept your invitation: ${acceptUrl}`,
    '',
    `This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.`,
    '',
    `Welcome to the Clankeep family!`,
    `The Clankeep Team`,
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You're invited to join ${escapeHtml(householdName || 'a household')} on Clankeep</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8FAFC;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
              
              <!-- Header with gradient background -->
              <tr>
                <td style="background: linear-gradient(135deg, #4D6BFF 0%, #7B61FF 100%); padding: 40px 40px 30px 40px; text-align: center;">
                  <div style="display: inline-block; background-color: #ffffff; padding: 12px 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #4D6BFF; letter-spacing: -0.025em;">Clankeep</h1>
                  </div>
                  <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff; line-height: 1.2;">You're Invited!</h2>
                </td>
              </tr>
              
              <!-- Main content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #111827; font-weight: 500;">Hello there! 👋</p>
                  
                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
                    <strong style="color: #4D6BFF;">${escapeHtml(inviterName || 'Someone')}</strong> has invited you to join
                    <strong style="color: #111827;">${escapeHtml(householdName || 'their household')}</strong> on Clankeep.
                  </p>
                  
                  <div style="background-color: #F8FAFC; border-left: 4px solid #4D6BFF; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                      <strong style="color: #111827;">What is Clankeep?</strong><br>
                      Clankeep is your cozy digital home companion that helps families organize shopping lists, track children's medicine, manage household finances, and stay connected with everything that makes your house a home. 🏡✨
                    </p>
                  </div>
                  
                  <p style="margin: 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
                    Ready to join your household and start organizing together?
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${safeAcceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #4D6BFF, #7B61FF); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: -0.025em; box-shadow: 0 4px 12px -2px rgba(77, 107, 255, 0.4);">
                      Accept Invitation
                    </a>
                  </div>
                  
                  <div style="background-color: #F8FAFC; border-radius: 8px; padding: 16px; margin: 24px 0;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4B5563;">Having trouble with the button?</p>
                    <p style="margin: 0; font-size: 13px; color: #94A3B8; word-break: break-all; line-height: 1.4;">
                      Copy and paste this link in your browser:<br>
                      <span style="color: #4D6BFF;">${safeAcceptUrl}</span>
                    </p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #F8FAFC; padding: 30px 40px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #4B5563; text-align: center;">
                    This invitation will expire in <strong>7 days</strong>. If you weren't expecting this invitation, you can safely ignore this email.
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #94A3B8; text-align: center;">
                    Welcome to the Clankeep family! 🌟<br>
                    <span style="font-weight: 500;">The Clankeep Team</span>
                  </p>
                </td>
              </tr>
              
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
