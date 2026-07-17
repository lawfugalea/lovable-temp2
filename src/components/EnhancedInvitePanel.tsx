import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { Mail, Copy, Check, AlertCircle, Users, Share2 } from 'lucide-react';

interface CreateInviteResponse {
  id: string;
  acceptUrl: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  email?: string | null;
  role: 'OWNER' | 'MEMBER';
  emailStatus?: { ok: boolean; error?: string };
}

interface EnhancedInvitePanelProps {
  householdId?: string;
  householdName?: string;
}

export default function EnhancedInvitePanel({ householdId, householdName }: EnhancedInvitePanelProps) {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'OWNER'>('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeHouseholdId, setActiveHouseholdId] = useState(householdId || '');

  // Get household ID if not provided
  useEffect(() => {
    if (householdId) {
      setActiveHouseholdId(householdId);
      return;
    }

    if (status !== 'authenticated') return;

    const getHouseholdId = async () => {
      try {
        const qs = new URLSearchParams(window.location.search);
        const hid = qs.get('hid');
        if (hid) {
          setActiveHouseholdId(hid);
          return;
        }

        const sessionHid = (session as any)?.user?.activeHouseholdId as string | undefined;
        if (sessionHid) {
          setActiveHouseholdId(sessionHid);
          return;
        }

        // Try to get active household
        const response = await fetch('/api/household/active');
        if (response.ok) {
          const data = await response.json();
          if (data.householdId) {
            setActiveHouseholdId(data.householdId);
          }
        }
      } catch (error) {
        console.error('Failed to get household ID:', error);
      }
    };

    getHouseholdId();
  }, [status, session, householdId]);

  const handleInvite = async () => {
    if (!activeHouseholdId) return;

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/household/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          householdId: activeHouseholdId,
          email: email.trim() ? email.trim().toLowerCase() : null,
          role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create invite');
      }

      const data = await response.json();
      setResult(data);
      
      if (data.emailStatus && !data.emailStatus.ok) {
        setError(`Email didn't send: ${data.emailStatus.error || 'unknown error'}`);
      }
      
      setEmail('');
    } catch (error: any) {
      setError(error.message || 'Failed to create invite');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareInvite = async () => {
    if (!result) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${householdName || 'our household'} on HouseFlow`,
          text: `You have been invited to join ${householdName || 'a household'} on HouseFlow.`,
          url: result.acceptUrl,
        });
      } else {
        await copyToClipboard(result.acceptUrl);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setError('Could not share the invite. Copy the link instead.');
    }
  };

  const isDisabled = submitting || !activeHouseholdId || status !== 'authenticated';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Invite Members
        </CardTitle>
        <CardDescription>
          Email an invitation or create a secure link for {householdName || 'your household'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-cozy-text">Email Address</label>
          <Input
            type="email"
            placeholder="family@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full"
          />
          <p className="text-xs text-cozy-text-muted">
            Leave this blank to create a link you can share yourself.
          </p>
        </div>

        {/* Role selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-cozy-text">Role</label>
          <div className="flex gap-2">
            <button
              onClick={() => setRole('MEMBER')}
              className={`flex-1 p-3 border rounded-lg text-sm transition-all ${
                role === 'MEMBER'
                  ? 'border-cozy-primary bg-cozy-primary/10 text-cozy-primary'
                  : 'border-cozy-gray-200 hover:border-cozy-gray-300'
              }`}
            >
              <div className="font-medium">Member</div>
              <div className="text-xs text-cozy-text-muted">Household access without member administration</div>
            </button>
            <button
              onClick={() => setRole('OWNER')}
              className={`flex-1 p-3 border rounded-lg text-sm transition-all ${
                role === 'OWNER'
                  ? 'border-cozy-primary bg-cozy-primary/10 text-cozy-primary'
                  : 'border-cozy-gray-200 hover:border-cozy-gray-300'
              }`}
            >
              <div className="font-medium">Owner</div>
              <div className="text-xs text-cozy-text-muted">Can invite, promote, remove, and manage members</div>
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleInvite}
          disabled={isDisabled}
          className="w-full"
        >
          {email.trim() ? <Mail className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
          {submitting
            ? (email.trim() ? 'Sending Invite...' : 'Creating Link...')
            : (email.trim() ? 'Send Invite' : 'Create Invite Link')}
        </Button>

        {/* Success result */}
        {result && (
          <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="w-4 h-4" />
              <span className="font-medium">Invite created successfully!</span>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-green-700">
                Invited: <span className="font-medium">{result.email || 'Link-only invite'}</span>
                {result.emailStatus?.ok && (
                  <Badge variant="secondary" className="ml-2">Email sent</Badge>
                )}
                {result.email && result.emailStatus && !result.emailStatus.ok && (
                  <Badge variant="secondary" className="ml-2">Email failed</Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-green-700">Share this link:</label>
                <div className="flex gap-2">
                  <Input
                    value={result.acceptUrl}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(result.acceptUrl)}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Native share where supported; clipboard fallback elsewhere. */}
        <div className="pt-4 border-t border-cozy-gray-200">
          <Button variant="outline" size="sm" className="w-full" onClick={shareInvite} disabled={!result}>
            <Share2 className="w-4 h-4 mr-2" />
            Share latest invite
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
