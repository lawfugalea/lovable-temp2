// src/lib/resend.ts
import { Resend } from 'resend';

const key = process.env.RESEND_API_KEY;
export const resend = key ? new Resend(key) : null;

export async function sendInviteEmail(opts: {
  to: string;
  acceptUrl: string;
  householdName: string;
  invitedByName?: string | null;
}) {
  if (!resend) {
    return { ok: false, error: 'RESEND_API_KEY not configured' as const };
  }
  const from = process.env.INVITES_FROM || 'Houseflow <no-reply@galeahub.online>';

  const subject = `You're invited to ${opts.householdName} on Houseflow`;
  const text = [
    opts.invitedByName ? `${opts.invitedByName} invited you to join their household.` : `You’ve been invited to join a household.`,
    '',
    `Accept the invite: ${opts.acceptUrl}`,
    '',
    `If you weren’t expecting this, you can ignore this email.`,
  ].join('\n');

  try {
    const resp = await resend.emails.send({
      from,
      to: opts.to,
      subject,
      text,
    });
    if ((resp as any)?.error) {
      return { ok: false, error: String((resp as any).error) };
    }
    return { ok: true, id: (resp as any)?.id ?? null };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Unknown Resend error' };
  }
}
