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
  const from = process.env.INVITES_FROM || 'Clankeep <noreply@clankeep.com>';

  const subject = `You're invited to join ${opts.householdName} on Clankeep`;
  const text = [
    `Hello!`,
    '',
    `${opts.invitedByName || 'Someone'} has invited you to join ${opts.householdName} on Clankeep - a cozy app for managing your household together.`,
    '',
    `Clankeep helps families organize shopping lists, track children's medicine, manage finances, and stay connected with everything that makes your house a home.`,
    '',
    `Accept your invitation: ${opts.acceptUrl}`,
    '',
    `This invitation will expire in 7 days. If you weren't expecting this invitation, you can safely ignore this email.`,
    '',
    `Welcome to the Clankeep family!`,
    `The Clankeep Team`,
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
