
// src/pages/invites/accept.tsx
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { withBasePath } from '@/lib/base-path';
import { prisma } from '@/lib/prisma';
import { hashInviteToken, normalizeInviteToken } from '@/lib/invite-tokens';

type Props = { 
  token?: string;
  error?: string;
  inviteInfo?: {
    householdName?: string;
    inviterName?: string;
  };
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  ctx.res.setHeader('Cache-Control', 'private, no-store');
  ctx.res.setHeader('Referrer-Policy', 'no-referrer');
  const token = normalizeInviteToken(ctx.query.token);
  if (!token) return { props: { error: 'Missing or invalid token' } };

  try {
    const invite = await prisma.invite.findUnique({
      where: { tokenHash: hashInviteToken(token) },
      select: {
        status: true,
        expiresAt: true,
        household: {
          select: {
            name: true,
            owner: { select: { name: true } },
          },
        },
      },
    });
    if (!invite || invite.status !== 'PENDING' || invite.expiresAt <= new Date()) {
      return { props: { error: 'Invalid or expired invite' } };
    }
    return { 
      props: { 
        token,
        inviteInfo: {
          householdName: invite.household.name,
          inviterName: invite.household.owner?.name || 'Household Member'
        }
      } 
    };
  } catch (error) {
    return { props: { error: 'Failed to validate invite' } };
  }
};

export default function AcceptInvitePage({ token, error, inviteInfo }: Props) {
  const { status, update } = useSession();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  useEffect(() => {
    if (error || !token) return;

    // If user is not authenticated, redirect to login with invite token.
    if (status === 'unauthenticated') {
      const next = `/invites/accept?token=${encodeURIComponent(token)}`;
      router.push(`/login?next=${encodeURIComponent(next)}&invite=${encodeURIComponent(token)}`);
      return;
    }
  }, [status, token, error, router]);

  const processInvite = async () => {
    if (!token) return;
    
    setProcessing(true);
    setProcessError(null);

    try {
      const response = await fetch('/api/invites/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      await update({ refreshProfile: true });
      // Redirect to dashboard with success flag and force page reload
      // This ensures the session is refreshed and data is reloaded
      window.location.href = withBasePath('/dashboard?joined=1');
    } catch (error: any) {
      console.error('Invite acceptance error:', error);
      setProcessError(error.message || 'Failed to accept invite');
    } finally {
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <>
        <Head><title>Invite Error – Houseflow</title></Head>
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
            <h1 className="text-lg font-semibold mb-2 text-red-600">Invite Error</h1>
            <p className="text-sm text-gray-700 mb-3">{error}</p>
            <Link href="/" className="text-sm text-fuchsia-600 underline">Go to Home</Link>
          </div>
        </main>
      </>
    );
  }

  if (processError) {
    return (
      <>
        <Head><title>Invite Error – Houseflow</title></Head>
        <main className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
            <h1 className="text-lg font-semibold mb-2 text-red-600">Error</h1>
            <p className="text-sm text-gray-700 mb-3">{processError}</p>
            <div className="flex gap-2">
              <button 
                onClick={processInvite}
                className="text-sm text-fuchsia-600 underline hover:text-fuchsia-800"
              >
                Try Again
              </button>
              <Link href="/" className="text-sm text-gray-600 underline">Go to Home</Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head><title>Accept Invite – Houseflow</title></Head>
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
            <h1 className="text-lg font-semibold mb-2">Join household</h1>
          {inviteInfo && (
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                You&apos;ve been invited to join <strong>{inviteInfo.householdName}</strong>
                {inviteInfo.inviterName && (
                  <span> by {inviteInfo.inviterName}</span>
                )}
              </p>
            </div>
          )}
          <p className="text-sm text-amber-700 mb-4">
            Joining will leave your current household. Household owners must transfer ownership first.
          </p>
          <button
            type="button"
            disabled={processing || status !== 'authenticated'}
            onClick={processInvite}
            className="rounded-lg bg-cozy-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {processing ? 'Joining…' : 'Accept invitation'}
          </button>
        </div>
      </main>
    </>
  );
}
