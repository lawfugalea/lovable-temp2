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
  if (/@demo\.clankeep\.invalid$/i.test(String(to ?? ''))) {
    throw new Error('Demo accounts cannot send email');
  }
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
  const logoUrl = escapeHtml(resolveLogoUrl(acceptUrl));
  const safeInviter = escapeHtml(inviterName || 'Someone');
  const safeHousehold = escapeHtml(householdName || 'their household');
  const preheader = `${inviterName || 'Someone'} invited you to ${householdName || 'a household'} — shopping lists, medicine schedules, notes and finances in one shared home.`;
  const text = [
    `Hi there,`,
    '',
    `${inviterName || 'Someone'} has invited you to join ${householdName || 'a household'} on Clankeep — the shared home for everything your household runs on.`,
    '',
    `Clankeep brings your household's shopping lists, medicine schedules, notes, and family finances together in one calm, private place.`,
    '',
    `Accept your invitation: ${acceptUrl}`,
    '',
    `This invitation expires in 7 days. If you weren't expecting it, you can safely ignore this email.`,
    '',
    `Together. Organised. At home.`,
    `The Clankeep Team`,
  ].join('\n');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>You're invited to join ${escapeHtml(householdName || 'a household')} on Clankeep</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8FAFC;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">

              <!-- Header with gradient background -->
              <tr>
                <td style="background: linear-gradient(135deg, #4D6BFF 0%, #7B61FF 100%); padding: 40px 40px 30px 40px; text-align: center;">
                  <div style="display: inline-block; background-color: #ffffff; padding: 14px 22px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <img src="${logoUrl}" width="176" height="51" alt="clankeep" style="display: block; width: 176px; height: auto; border: 0; font-size: 22px; font-weight: 700; color: #4D6BFF; letter-spacing: -0.025em;">
                  </div>
                  <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff; line-height: 1.2;">You're invited</h2>
                </td>
              </tr>

              <!-- Main content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #111827; font-weight: 500;">Hi there,</p>

                  <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
                    <strong style="color: #4D6BFF;">${safeInviter}</strong> has invited you to join
                    <strong style="color: #111827;">${safeHousehold}</strong> on Clankeep — the shared home for
                    everything your household runs on.
                  </p>

                  <div style="background-color: #F4F6FE; padding: 20px; margin: 24px 0; border-radius: 12px;">
                    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                      <strong style="color: #111827;">What is Clankeep?</strong><br>
                      Clankeep brings your household's shopping lists, medicine schedules, notes, and family
                      finances together in one calm, private place — so everyone is finally on the same page.
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${safeAcceptUrl}" style="display: inline-block; background: linear-gradient(135deg, #4D6BFF, #7B61FF); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: -0.025em; box-shadow: 0 4px 12px -2px rgba(77, 107, 255, 0.4);">
                      Accept invitation
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
                    This invitation expires in <strong>7 days</strong>. If you weren't expecting it, you can safely ignore this email.
                  </p>
                  <p style="margin: 0; font-size: 13px; color: #94A3B8; text-align: center;">
                    Together. Organised. At home.<br>
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

type DeliverArgs = { to: string; subject: string; text: string; html: string };

/** Shared Resend delivery with the same sender rules as invites. */
async function deliver({ to, subject, text, html }: DeliverArgs): Promise<MailResult> {
  if (/@demo\.clankeep\.invalid$/i.test(String(to ?? ''))) {
    throw new Error('Demo accounts cannot send email');
  }
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
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const ct = r.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok) {
      const msg = typeof body === 'string' ? body : body?.error || body?.message || JSON.stringify(body || {});
      return { ok: false, error: `Resend ${r.status}: ${msg}`, fromUsed: fromHeader, to };
    }
    const providerId = typeof body === 'object' ? body?.id : undefined;
    return { ok: true, providerId, fromUsed: fromHeader, to };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e), fromUsed: fromHeader, to };
  }
}

type ShellArgs = {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
  footerNote: string;
  /** Any absolute URL on the app's origin, used to resolve the hosted logo. */
  originUrl: string;
};

/** The shared branded HTML wrapper used by every transactional email. */
function renderEmailShell({ title, preheader, heading, bodyHtml, footerNote, originUrl }: ShellArgs): string {
  const logoUrl = escapeHtml(resolveLogoUrl(originUrl));
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light">
      <meta name="supported-color-schemes" content="light">
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${escapeHtml(preheader)}</div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F8FAFC;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden;">
              <tr>
                <td style="background: linear-gradient(135deg, #4D6BFF 0%, #7B61FF 100%); padding: 40px 40px 30px 40px; text-align: center;">
                  <div style="display: inline-block; background-color: #ffffff; padding: 14px 22px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                    <img src="${logoUrl}" width="176" height="51" alt="clankeep" style="display: block; width: 176px; height: auto; border: 0; font-size: 22px; font-weight: 700; color: #4D6BFF; letter-spacing: -0.025em;">
                  </div>
                  <h2 style="margin: 0; font-size: 28px; font-weight: 600; color: #ffffff; line-height: 1.2;">${escapeHtml(heading)}</h2>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">${bodyHtml}</td>
              </tr>
              <tr>
                <td style="background-color: #F8FAFC; padding: 30px 40px; border-top: 1px solid #E5E7EB;">
                  <p style="margin: 0 0 12px 0; font-size: 14px; color: #4B5563; text-align: center;">${footerNote}</p>
                  <p style="margin: 0; font-size: 13px; color: #94A3B8; text-align: center;">
                    Together. Organised. At home.<br>
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
}

function ctaButtonHtml(url: string, label: string): string {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${escapeHtml(url)}" style="display: inline-block; background: linear-gradient(135deg, #4D6BFF, #7B61FF); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; letter-spacing: -0.025em; box-shadow: 0 4px 12px -2px rgba(77, 107, 255, 0.4);">${escapeHtml(label)}</a>
    </div>
    <div style="background-color: #F8FAFC; border-radius: 8px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4B5563;">Having trouble with the button?</p>
      <p style="margin: 0; font-size: 13px; color: #94A3B8; word-break: break-all; line-height: 1.4;">
        Copy and paste this link in your browser:<br>
        <span style="color: #4D6BFF;">${escapeHtml(url)}</span>
      </p>
    </div>
  `;
}

type SendWelcomeArgs = { to: string; name?: string | null; signInUrl: string };

export async function sendWelcomeEmail({ to, name, signInUrl }: SendWelcomeArgs): Promise<MailResult> {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
  const subject = 'Welcome to Clankeep — your household HQ';
  const preheader = 'Your account is ready. Set up your household and bring the whole clan on board.';
  const text = [
    `Hi ${firstName},`,
    '',
    `Your Clankeep account is ready. Clankeep is the private HQ for everything your household shares — shopping lists, meal plans, chores, medicine schedules, money planning and notes.`,
    '',
    `Get started:`,
    `1. Sign in: ${signInUrl}`,
    `2. Create your household`,
    `3. Invite your family by email or link`,
    '',
    `Everything in the Free plan is free forever — no card, no trial clock.`,
    '',
    `If you didn't create this account, you can safely ignore this email.`,
    '',
    `Together. Organised. At home.`,
    `The Clankeep Team`,
  ].join('\n');
  const bodyHtml = `
    <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #111827; font-weight: 500;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
      Your Clankeep account is ready. Clankeep is the private HQ for everything your household shares —
      shopping lists, meal plans, chores, medicine schedules, money planning and notes.
    </p>
    <div style="background-color: #F4F6FE; padding: 20px; margin: 24px 0; border-radius: 12px;">
      <p style="margin: 0; font-size: 15px; line-height: 1.8; color: #4B5563;">
        <strong style="color: #111827;">Get started in three steps</strong><br>
        1. Sign in to your new account<br>
        2. Create your household<br>
        3. Invite your family by email or link
      </p>
    </div>
    ${ctaButtonHtml(signInUrl, 'Sign in to Clankeep')}
  `;
  const html = renderEmailShell({
    title: subject,
    preheader,
    heading: 'Welcome to Clankeep',
    bodyHtml,
    footerNote: `Everything in the Free plan is free forever. If you didn't create this account, you can safely ignore this email.`,
    originUrl: signInUrl,
  });
  return deliver({ to, subject, text, html });
}

type SendPasswordResetArgs = { to: string; name?: string | null; resetUrl: string; expiresMinutes: number };

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresMinutes }: SendPasswordResetArgs): Promise<MailResult> {
  const firstName = (name || '').trim().split(/\s+/)[0] || 'there';
  const subject = 'Reset your Clankeep password';
  const preheader = `Use this link to choose a new password. It expires in ${expiresMinutes} minutes.`;
  const text = [
    `Hi ${firstName},`,
    '',
    `Someone asked to reset the password for this Clankeep account. If it was you, use this link to choose a new password:`,
    '',
    resetUrl,
    '',
    `The link expires in ${expiresMinutes} minutes and can be used once.`,
    '',
    `If you didn't ask for this, you can safely ignore this email — your password stays unchanged.`,
    '',
    `Together. Organised. At home.`,
    `The Clankeep Team`,
  ].join('\n');
  const bodyHtml = `
    <p style="margin: 0 0 24px 0; font-size: 18px; line-height: 1.6; color: #111827; font-weight: 500;">Hi ${escapeHtml(firstName)},</p>
    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #4B5563;">
      Someone asked to reset the password for this Clankeep account. If it was you,
      use the button below to choose a new password.
    </p>
    ${ctaButtonHtml(resetUrl, 'Choose a new password')}
  `;
  const html = renderEmailShell({
    title: subject,
    preheader,
    heading: 'Reset your password',
    bodyHtml,
    footerNote: `The link expires in <strong>${expiresMinutes} minutes</strong> and can be used once. If you didn't ask for this, ignore this email — your password stays unchanged.`,
    originUrl: resetUrl,
  });
  return deliver({ to, subject, text, html });
}

/** Hosted logo for the email header, served from the same origin the invite links to. */
function resolveLogoUrl(acceptUrl: string): string {
  try {
    return new URL('/brand/clankeep-logo-email.png', acceptUrl).toString();
  } catch {
    return 'https://clankeep.com/brand/clankeep-logo-email.png';
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
