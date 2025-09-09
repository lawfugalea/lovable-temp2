import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  Check,
  X,
  Clock
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

  const currentUserId = (session as any)?.user?.id;

  const loadData = async () => {
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
  };

  useEffect(() => {
    if (householdId) {
      loadData();
    }
  }, [householdId]);

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invite?')) return;
    
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
    } catch (error: any) {
      alert(`Failed to revoke invite: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the household?`)) return;
    
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
      alert(`Failed to remove member: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!confirm('Are you sure you want to leave this household? You will lose access to all household data.')) return;
    
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
      window.location.href = '/';
    } catch (error: any) {
      alert(`Failed to leave household: ${error.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-cozy-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cozy-text-muted">Loading household data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-cozy-text mb-2">Error Loading Data</h3>
          <p className="text-cozy-text-muted mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isOwner = viewerRole === 'OWNER';
  const currentUserMember = members.find(m => m.user.id === currentUserId);

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
              <div className="text-center py-8 text-cozy-text-muted">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No pending invites</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cozy-primary/20 rounded-full flex items-center justify-center">
                        <Mail className="w-4 h-4 text-cozy-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-cozy-text">
                          {invite.email || 'Link-only invite'}
                        </div>
                        <div className="text-sm text-cozy-text-muted flex items-center gap-2">
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
              <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cozy-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-white">
                      {member.user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-cozy-text">
                      {member.user.name || 'Unknown User'}
                      {member.user.id === currentUserId && (
                        <span className="text-sm text-cozy-text-muted ml-2">(You)</span>
                      )}
                    </div>
                    <div className="text-sm text-cozy-text-muted">
                      {member.user.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  
                  {/* Action buttons */}
                  {member.role !== 'OWNER' && isOwner && (
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
                  )}
                  
                  {/* Leave button for non-owners */}
                  {member.user.id === currentUserId && member.role !== 'OWNER' && (
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
