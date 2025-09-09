// src/pages/invites/accept.tsx
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

type Props = { 
  token?: string;
  error?: string;
  inviteInfo?: {
    householdName?: string;
    inviterName?: string;
  };
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const token = (ctx.query.token as string | undefined)?.trim() || '';
  if (!token) return { props: { error: 'Missing token' } };

  // Just validate the token exists and is valid, don't do heavy operations here
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/invites/validate?token=${encodeURIComponent(token)}`);
    if (!response.ok) {
      return { props: { error: 'Invalid or expired invite' } };
    }
    const data = await response.json();
    return { 
      props: { 
        token,
        inviteInfo: {
          householdName: data.householdName,
          inviterName: data.inviterName
        }
      } 
    };
  } catch (error) {
    return { props: { error: 'Failed to validate invite' } };
  }
};

export default function AcceptInvitePage({ token, error, inviteInfo }: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  useEffect(() => {
    if (error || !token) return;

    // If user is not authenticated, redirect to login with invite token
    if (status === 'unauthenticated') {
      const next = `/invites/accept?token=${encodeURIComponent(token)}`;
      router.push(`/?signin=1&next=${encodeURIComponent(next)}&invite=${encodeURIComponent(token)}`);
      return;
    }

    // If user is authenticated, process the invite
    if (status === 'authenticated' && !processing && !processError) {
      processInvite();
    }
  }, [status, token, error, processing, processError]);

  const processInvite = async () => {
    if (!token) return;
    
    setProcessing(true);
    setProcessError(null);

    try {
      const response = await fetch(`/api/invites/accept?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to accept invite');
      }

      // Redirect to dashboard on success
      router.push('/dashboard?joined=1');
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
      <Head><title>Accepting Invite – Houseflow</title></Head>
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-black/5 bg-white shadow p-6">
          <h1 className="text-lg font-semibold mb-2">Accepting Invite</h1>
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
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-600">
              {processing ? 'Processing invite...' : 'Checking authentication...'}
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
