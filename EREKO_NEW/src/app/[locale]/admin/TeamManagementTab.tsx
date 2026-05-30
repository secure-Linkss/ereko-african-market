'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users, UserPlus, Shield, ShieldOff, Trash2, Crown, ChevronDown,
  ChevronUp, Clock, Mail, AlertTriangle, CheckCircle2, Activity,
  Eye, Settings, Package, Headphones, Megaphone, UserCog,
} from 'lucide-react';
import {
  useAdminTeamMembers, useInviteTeamMember, useUpdateTeamMember,
  useSuspendTeamMember, useDeleteTeamMember, TeamMember, StaffRole,
} from '@/services/team';
import { useAdminAuditLog } from '@/services/users';
import type { UserProfile } from '@/types';

const ROLE_CONFIG: Record<StaffRole, { label: string; bg: string; text: string; icon: any; desc: string }> = {
  owner:       { label: 'Owner',       bg: 'bg-amber-100',   text: 'text-amber-800',   icon: Crown,     desc: 'Full platform access' },
  admin:       { label: 'Admin',       bg: 'bg-blue-100',    text: 'text-blue-800',    icon: Shield,    desc: 'Manage all content' },
  fulfillment: { label: 'Fulfillment', bg: 'bg-violet-100',  text: 'text-violet-800',  icon: Package,   desc: 'Orders & inventory' },
  support:     { label: 'Support',     bg: 'bg-teal-100',    text: 'text-teal-800',    icon: Headphones,desc: 'Customer care' },
  marketing:   { label: 'Marketing',   bg: 'bg-pink-100',    text: 'text-pink-800',    icon: Megaphone, desc: 'Promotions & discounts' },
  viewer:      { label: 'Viewer',      bg: 'bg-gray-100',    text: 'text-gray-700',    icon: Eye,       desc: 'Read-only access' },
};

const STATUS_CONFIG = {
  active:    { label: 'Active',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  invited:   { label: 'Invited',   bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400' },
  suspended: { label: 'Suspended', bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

interface Props { currentUser: UserProfile | null }

export function TeamManagementTab({ currentUser }: Props) {
  const isSuperAdmin = currentUser?.isSuperAdmin;
  const isOwner = currentUser?.teamRole === 'owner' || currentUser?.staffRole === 'owner';
  const canManage = isSuperAdmin || isOwner;

  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', firstName: '', lastName: '', teamRole: 'viewer' as StaffRole });
  const [inviteError, setInviteError] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>('viewer');
  const [suspendConfirm, setSuspendConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [auditMemberId, setAuditMemberId] = useState<string | null>(null);

  const { data: members, isLoading } = useAdminTeamMembers();
  const invite = useInviteTeamMember();
  const update = useUpdateTeamMember();
  const suspend = useSuspendTeamMember();
  const remove = useDeleteTeamMember();

  const memberList: TeamMember[] = Array.isArray(members) ? members : [];

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    if (!inviteForm.email.trim()) { setInviteError('Email is required.'); return; }
    try {
      await invite.mutateAsync(inviteForm);
      setShowInvite(false);
      setInviteForm({ email: '', firstName: '', lastName: '', teamRole: 'viewer' });
    } catch {
      setInviteError('Failed to send invite. Check the email and try again.');
    }
  }

  async function handleUpdateRole(memberId: string) {
    await update.mutateAsync({ memberId, teamRole: editRole });
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Team Management</h2>
          <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
          <p className="text-sm text-muted-foreground">
            {canManage ? 'Invite and manage staff roles and access.' : 'View your team members.'}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(!showInvite)} className="gap-2 shadow-md">
            <UserPlus className="w-4 h-4" />
            {showInvite ? 'Cancel' : 'Invite Member'}
          </Button>
        )}
      </div>

      {/* Invite form */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-6">
                <p className="text-sm font-bold mb-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" /> New Team Member
                </p>
                <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Email *</label>
                    <input
                      type="email"
                      value={inviteForm.email}
                      onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="colleague@ereko.co.uk"
                      className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">First Name</label>
                    <input
                      value={inviteForm.firstName}
                      onChange={e => setInviteForm(f => ({ ...f, firstName: e.target.value }))}
                      placeholder="Jane"
                      className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Last Name</label>
                    <input
                      value={inviteForm.lastName}
                      onChange={e => setInviteForm(f => ({ ...f, lastName: e.target.value }))}
                      placeholder="Doe"
                      className="h-9 w-full rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Role</label>
                    <select
                      value={inviteForm.teamRole}
                      onChange={e => setInviteForm(f => ({ ...f, teamRole: e.target.value as StaffRole }))}
                      className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {(Object.keys(ROLE_CONFIG) as StaffRole[]).filter(r => r !== 'owner' || isSuperAdmin).map(r => (
                        <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                      ))}
                    </select>
                  </div>
                  {inviteError && <p className="col-span-full text-xs text-destructive">{inviteError}</p>}
                  <div className="col-span-full flex gap-2">
                    <Button type="submit" size="sm" disabled={invite.isPending} className="gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      {invite.isPending ? 'Sending...' : 'Send Invite'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancel</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {!isLoading && memberList.length > 0 && (
        <div className="flex gap-6 text-xs text-muted-foreground flex-wrap">
          <span><span className="font-bold text-foreground">{memberList.length}</span> members</span>
          <span><span className="font-bold text-emerald-600">{memberList.filter(m => m.status === 'active').length}</span> active</span>
          <span><span className="font-bold text-amber-600">{memberList.filter(m => m.status === 'invited').length}</span> pending invite</span>
          {memberList.filter(m => m.status === 'suspended').length > 0 && (
            <span><span className="font-bold text-red-600">{memberList.filter(m => m.status === 'suspended').length}</span> suspended</span>
          )}
        </div>
      )}

      {/* Member grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : memberList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No team members yet. Invite your first staff member.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {memberList.map(member => (
            <TeamCard
              key={member.id}
              member={member}
              canManage={canManage ?? false}
              isSuperAdmin={isSuperAdmin ?? false}
              isEditingRole={editingId === member.id}
              editRole={editRole}
              onStartEditRole={() => { setEditingId(member.id); setEditRole(member.teamRole); }}
              onCancelEditRole={() => setEditingId(null)}
              onSaveRole={() => handleUpdateRole(member.id)}
              onEditRoleChange={setEditRole}
              updatePending={update.isPending}
              onSuspend={() => setSuspendConfirm({ id: member.id, name: member.firstName ? `${member.firstName} ${member.lastName ?? ''}`.trim() : member.email })}
              onDelete={() => setDeleteConfirm({ id: member.id, name: member.firstName ? `${member.firstName} ${member.lastName ?? ''}`.trim() : member.email })}
              showAudit={auditMemberId === member.id}
              onToggleAudit={() => setAuditMemberId(auditMemberId === member.id ? null : member.id)}
            />
          ))}
        </motion.div>
      )}

      {/* Super Admin Danger Zone */}
      {isSuperAdmin && (
        <Card className="border-destructive/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-sm font-bold text-destructive">Super Admin — Danger Zone</p>
            </div>
            <p className="text-xs text-muted-foreground">
              As a Super Admin you have full authority over all accounts including owners.
              Actions here are permanent and logged. Use with care.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Suspend confirm modal */}
      <AnimatePresence>
        {suspendConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <ShieldOff className="w-7 h-7 text-amber-600" />
              </div>
              <p className="text-center font-bold text-lg">Suspend Member?</p>
              <p className="text-center text-sm text-muted-foreground">
                {suspendConfirm.name} will lose admin access immediately.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setSuspendConfirm(null)}>Cancel</Button>
                <Button
                  className="flex-1 bg-amber-500 hover:bg-amber-600"
                  disabled={suspend.isPending}
                  onClick={async () => { await suspend.mutateAsync(suspendConfirm.id); setSuspendConfirm(null); }}
                >
                  {suspend.isPending ? 'Suspending...' : 'Suspend'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <Trash2 className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-center font-bold text-lg">Remove from Team?</p>
              <p className="text-center text-sm text-muted-foreground">
                {deleteConfirm.name} will lose all admin access. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  disabled={remove.isPending}
                  onClick={async () => { await remove.mutateAsync(deleteConfirm.id); setDeleteConfirm(null); }}
                >
                  {remove.isPending ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamCard({
  member, canManage, isSuperAdmin,
  isEditingRole, editRole, onStartEditRole, onCancelEditRole, onSaveRole, onEditRoleChange,
  updatePending, onSuspend, onDelete,
  showAudit, onToggleAudit,
}: {
  member: TeamMember;
  canManage: boolean;
  isSuperAdmin: boolean;
  isEditingRole: boolean;
  editRole: StaffRole;
  onStartEditRole: () => void;
  onCancelEditRole: () => void;
  onSaveRole: () => void;
  onEditRoleChange: (r: StaffRole) => void;
  updatePending: boolean;
  onSuspend: () => void;
  onDelete: () => void;
  showAudit: boolean;
  onToggleAudit: () => void;
}) {
  const role = ROLE_CONFIG[member.teamRole] ?? ROLE_CONFIG.viewer;
  const RoleIcon = role.icon;
  const statusCfg = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.active;
  const initials = ((member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')).toUpperCase() || member.email[0].toUpperCase();
  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email;
  const isOwnerRole = member.teamRole === 'owner';

  const { data: auditEntries, isLoading: auditLoading } = useAdminAuditLog(member.id, showAudit);

  return (
    <motion.div variants={cardVariants}>
      <Card className={`h-full transition-all duration-300 ${member.status === 'suspended' ? 'opacity-60' : ''} hover:shadow-lg`}>
        <CardContent className="p-5 space-y-4">
          {/* Top row */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm ${isOwnerRole ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white' : 'bg-gradient-to-br from-primary/20 to-primary/40 text-primary'}`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {/* Role badge */}
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${role.bg} ${role.text}`}>
                  <RoleIcon className="w-3 h-3" /> {role.label}
                </span>
                {/* Status dot */}
                <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} /> {statusCfg.label}
                </span>
              </div>
            </div>
          </div>

          {/* Last login */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {member.lastLoginAt
              ? `Last login: ${new Date(member.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}`
              : member.status === 'invited' ? 'Invite pending — not yet logged in' : 'Never logged in'}
          </div>

          {/* Role edit inline */}
          {canManage && !isOwnerRole && member.status !== 'suspended' && (
            isEditingRole ? (
              <div className="flex items-center gap-2">
                <select
                  value={editRole}
                  onChange={e => onEditRoleChange(e.target.value as StaffRole)}
                  className="h-8 flex-1 rounded-lg border border-border bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {(Object.keys(ROLE_CONFIG) as StaffRole[]).filter(r => r !== 'owner' || isSuperAdmin).map(r => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label} — {ROLE_CONFIG[r].desc}</option>
                  ))}
                </select>
                <Button size="sm" className="h-8 text-xs px-3" disabled={updatePending} onClick={onSaveRole}>
                  {updatePending ? '...' : 'Save'}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs px-3" onClick={onCancelEditRole}>Cancel</Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">{role.desc}</p>
            )
          )}

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-border/60 flex-wrap">
              {!isOwnerRole && (
                <button
                  onClick={onStartEditRole}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings className="w-3 h-3" /> Edit Role
                </button>
              )}
              <button
                onClick={onToggleAudit}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Activity className="w-3 h-3" />
                {showAudit ? 'Hide' : 'Activity'}
              </button>
              {member.status === 'active' && !isOwnerRole && (
                <button
                  onClick={onSuspend}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors ml-auto"
                >
                  <ShieldOff className="w-3 h-3" /> Suspend
                </button>
              )}
              {isSuperAdmin && !isOwnerRole && (
                <button
                  onClick={onDelete}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          )}

          {/* Audit Log section */}
          <AnimatePresence initial={false}>
            {showAudit && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="pt-3 border-t border-border/60 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Activity className="w-3 h-3" /> Recent Activity
                  </p>
                  {auditLoading ? (
                    <div className="space-y-1.5">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-6 rounded" />)}
                    </div>
                  ) : !auditEntries || auditEntries.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No activity logged yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {auditEntries.slice(0, 10).map((entry: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-primary/60 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium">{entry.action?.replace(/_/g, ' ')}</span>
                            {entry.targetId && <span className="text-muted-foreground"> · {entry.targetId.slice(0, 8)}</span>}
                          </div>
                          <span className="text-muted-foreground flex-shrink-0">
                            {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
