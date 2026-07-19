import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { withBasePath } from '@/lib/base-path';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { 
  Users, 
  Mail, 
  UserMinus, 
  LogOut, 
  RefreshCw, 
  AlertCircle, 
  X,
  Clock,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
} from 'lucide-react';

interface Invite {
  id: string;
  email: string | null;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
}

interface Member {
  id: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    createdAt: string;
  };
}

interface HouseholdManagementProps {
  householdId: string;
  householdName?: string;
}

export default function HouseholdManagement({ householdId, householdName }: HouseholdManagementProps) {
  const { data: session } = useSession();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [viewerRole, setViewerRole] = useState<'OWNER' | 'MEMBER' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = useState<Record<string, string>>({});
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const confirm = useConfirm();

  const currentUserId = (session as any)?.user?.id;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load pending invites
      const invitesResponse = await fetch(
        `/api/household/invites?householdId=${encodeURIComponent(householdId)}`,
        { credentials: 'include' }
      );
      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json();
        setInvites(invitesData.invites || []);
      }

      // Load members
      const membersResponse = await fetch(
        `/api/household/members?householdId=${encodeURIComponent(householdId)}`,
        { credentials: 'include' }
      );
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData.members || []);
        setViewerRole(membersData.viewerRole || null);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load household data');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    if (householdId) {
      void loadData();
    }
  }, [householdId, loadData]);

  const handleRevokeInvite = async (inviteId: string) => {
    if (!(await confirm({ title: 'Revoke invite', description: 'Are you sure you want to revoke this invite?', confirmText: 'Revoke', destructive: true }))) return;
    
    setActionLoading(inviteId);
    try {
      const response = await fetch(`/api/household/invites/${inviteId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to revoke invite');
      }
      
      setInvites(prev => prev.filter(invite => invite.id !== inviteId));
      setInviteLinks(prev => {
        const next = { ...prev };
        delete next[inviteId];
        return next;
      });
    } catch (error: any) {
      toast.error(`Failed to revoke invite: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setActionLoading(`resend-${inviteId}`);
    try {
      const response = await fetch(`/api/household/invites/${inviteId}/resend`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (typeof data.acceptUrl === 'string') {
        setInviteLinks(prev => ({ ...prev, [inviteId]: data.acceptUrl }));
      }
      if (!response.ok) throw new Error(data.error || 'Failed to resend invite');
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invite');
    } finally {
      setActionLoading(null);
    }
  };

  const copyInviteLink = async (inviteId: string) => {
    const link = inviteLinks[inviteId];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInviteId(inviteId);
      setTimeout(() => setCopiedInviteId(current => current === inviteId ? null : current), 2000);
    } catch {
      toast.error('Could not copy the invite link');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!(await confirm({ title: 'Remove member', description: `Are you sure you want to remove ${memberName} from the household?`, confirmText: 'Remove', destructive: true }))) return;
    
    setActionLoading(memberId);
    try {
      const response = await fetch(`/api/household/members/${memberId}/remove`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to remove member');
      }
      
      setMembers(prev => prev.filter(member => member.id !== memberId));
    } catch (error: any) {
      toast.error(`Failed to remove member: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRoleChange = async (member: Member, role: 'OWNER' | 'MEMBER') => {
    const action = role === 'OWNER' ? 'promote' : 'demote';
    if (!(await confirm({ title: `${action === 'promote' ? 'Promote' : 'Demote'} member`, description: `Are you sure you want to ${action} ${member.user.name || member.user.email}?`, confirmText: action === 'promote' ? 'Promote' : 'Demote' }))) return;

    setActionLoading(`role-${member.id}`);
    try {
      const response = await fetch(`/api/household/members/${member.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Failed to ${action} member`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} member`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!(await confirm({ title: 'Leave household', description: 'Are you sure you want to leave this household? You will lose access to all household data.', confirmText: 'Leave', destructive: true }))) return;
    
    setActionLoading('leave');
    try {
      const response = await fetch('/api/household/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave household');
      }
      
      // Redirect to home page after leaving
      window.location.href = withBasePath('/');
    } catch (error: any) {
      toast.error(`Failed to leave household: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading household data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isOwner = viewerRole === 'OWNER';
  const ownerCount = members.filter(member => member.role === 'OWNER').length;

  return (
    <div className="space-y-6">
      {/* Pending Invites */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invites
            </CardTitle>
            <CardDescription>
              Invitations that haven&apos;t been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending invites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div key={invite.id} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-8 h-8 shrink-0 bg-primary/20 rounded-full flex items-center justify-center">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {invite.email || 'Link-only invite'}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {invite.role}
                            </Badge>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Expires {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {invite.email && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(invite.id)}
                            disabled={actionLoading === `resend-${invite.id}`}
                          >
                            <RefreshCw className={`w-4 h-4 ${actionLoading === `resend-${invite.id}` ? 'animate-spin' : ''}`} />
                            Resend
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite.id)}
                          disabled={actionLoading === invite.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {actionLoading === invite.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    </div>
                    {inviteLinks[invite.id] && (
                      <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
                        <input
                          value={inviteLinks[invite.id]}
                          readOnly
                          aria-label="New invite link"
                          className="min-w-0 flex-1 bg-transparent text-xs text-amber-900 outline-none"
                        />
                        <Button variant="outline" size="sm" onClick={() => copyInviteLink(invite.id)}>
                          {copiedInviteId === invite.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          Copy
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Household Members
          </CardTitle>
          <CardDescription>
            People who have access to {householdName || 'this household'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex flex-col gap-3 p-3 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="w-8 h-8 shrink-0 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {member.user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {member.user.name || 'Unknown User'}
                      {member.user.id === currentUserId && (
                        <span className="text-sm text-muted-foreground ml-2">(You)</span>
                      )}
                    </div>
                    <div className="truncate text-sm text-muted-foreground">
                      {member.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  
                  {/* Action buttons */}
                  {member.role !== 'OWNER' && isOwner && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRoleChange(member, 'OWNER')}
                        disabled={actionLoading === `role-${member.id}`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        Promote
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.user.name || 'this member')}
                        disabled={actionLoading === member.id}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        {actionLoading === member.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <UserMinus className="w-4 h-4" />
                        )}
                        Remove
                      </Button>
                    </>
                  )}

                  {member.role === 'OWNER' && isOwner && ownerCount > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRoleChange(member, 'MEMBER')}
                      disabled={actionLoading === `role-${member.id}`}
                    >
                      <ShieldOff className="w-4 h-4" />
                      Demote
                    </Button>
                  )}
                  
                  {/* Members may leave; owners may leave once another owner remains. */}
                  {member.user.id === currentUserId && (member.role !== 'OWNER' || ownerCount > 1) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLeaveHousehold}
                      disabled={actionLoading === 'leave'}
                      className="text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      {actionLoading === 'leave' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      Leave
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Refresh button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={loadData} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
