// src/pages/invites/accept.tsx
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';

type Props = { error?: string };

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const token = (ctx.query.token as string | undefined)?.trim() || '';
  if (!token) return { props: { error: 'Missing token' } };

  // 1) Find invite & validate
  const invite = await prisma.invite.findUnique({
    where: { token },
    select: { id: true, status: true, role: true, expiresAt: true, householdId: true },
  });
  if (!invite) return { props: { error: 'Invite not found' } };
  if (invite.status !== 'PENDING') return { props: { error: 'Invite already used or not pending' } };
  if (invite.expiresAt <= new Date()) return { props: { error: 'Invite expired' } };

  // 2) Check if user is logged in
  const session = (await getServerSession(ctx.req, ctx.res, authOptions as any)) as any;
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    // User not logged in - redirect to login/register with invite token
    const next = `/invites/accept?token=${encodeURIComponent(token)}`;
    return { redirect: { destination: `/?signin=1&next=${encodeURIComponent(next)}&invite=${encodeURIComponent(token)}`, permanent: false } };
  }

  // 3) Check if user is already a member
  const existing = await prisma.membership.findFirst({
    where: { userId, householdId: invite.householdId },
    select: { id: true, role: true },
  });
  
  if (!existing) {
    // User is not a member, create membership
    await prisma.membership.create({
      data: { userId, householdId: invite.householdId, role: invite.role },
    });
  } else {
    // User is already a member, but we still need to mark the invite as accepted
    // This handles the case where someone clicks the invite link multiple times
  }

  // 4) Mark invite accepted and set active household
  await prisma.$transaction(async (tx) => {
    // Mark invite as accepted
    await tx.invite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date(), acceptedById: userId },
    });
    
    // Set this household as the user's active household
    await tx.user.update({
      where: { id: userId },
      data: { activeHouseholdId: invite.householdId },
    });
  });

  // 5) Redirect to Settings with success banner
  return {
    redirect: {
      destination: `/settings?hid=${encodeURIComponent(invite.householdId)}&joined=1`,
      permanent: false,
    },
  };
};

export default function AcceptInvitePage({ error }: Props) {
  return (
    <>
      <Head><title>Invite – Houseflow</title></Head>
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Invite</h1>
          {error ? (
            <>
              <p className="text-sm text-gray-700 mb-3">{error}</p>
              <Link href="/settings" className="text-sm text-fuchsia-600 underline">Go to Settings</Link>
            </>
          ) : (
            <p className="text-sm text-gray-600">Completing…</p>
          )}
        </div>
      </main>
    </>
  );
}
