'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Users, Search, ChevronDown, ChevronUp, Shield, ShieldOff, Trash2,
  Star, Package, Phone, Mail, MapPin, AlertCircle, CheckCircle2, Crown,
  UserX, UserCheck, Eye, Send, Megaphone,
} from 'lucide-react';
import { useAdminUsers, useUpdateUserStatus, useAdminUserDetail, AdminUser } from '@/services/users';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { UserProfile } from '@/types';

const TIER_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  Member:  { label: 'Member',  bg: 'bg-gray-100',    text: 'text-gray-700',   icon: Users },
  Family:  { label: 'Family',  bg: 'bg-blue-100',    text: 'text-blue-700',   icon: Users },
  Elder:   { label: 'Elder',   bg: 'bg-purple-100',  text: 'text-purple-700', icon: Star },
  Royalty: { label: 'Royalty', bg: 'bg-amber-100',   text: 'text-amber-700',  icon: Crown },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const stagger: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

interface Props { currentUser: UserProfile | null }

export function UserManagementTab({ currentUser }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'customer' | 'staff' | 'all'>('customer');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; isActive: boolean; name: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const isSuperAdmin = !!currentUser?.isSuperAdmin;
  const isOwner = currentUser?.teamRole === 'owner' || currentUser?.staffRole === 'owner';
  const canSuspend = isSuperAdmin || !!isOwner;
  const canDelete = isSuperAdmin;

  // Custom notification send
  const [notifModal, setNotifModal] = useState<{ userId?: string; userName?: string; broadcast?: boolean } | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSendEmail, setNotifSendEmail] = useState(true);
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');

  const sendNotif = useMutation({
    mutationFn: async (payload: { targetUserId?: string; title: string; message: string; sendEmail: boolean }) => {
      const res = await apiClient.post('/api/v1/admin/notifications/send', payload);
      return res.data;
    },
  });

  async function handleSendNotif() {
    if (!notifTitle.trim() || !notifMessage.trim()) { setNotifError('Title and message are required.'); return; }
    setNotifError('');
    try {
      const result = await sendNotif.mutateAsync({
        targetUserId: notifModal?.userId,
        title: notifTitle,
        message: notifMessage,
        sendEmail: notifSendEmail,
      });
      setNotifSuccess(`Sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}${result.emailsSent ? ` (${result.emailsSent} emails)` : ''}.`);
      setTimeout(() => { setNotifModal(null); setNotifTitle(''); setNotifMessage(''); setNotifSuccess(''); }, 2000);
    } catch {
      setNotifError('Failed to send notification. Please try again.');
    }
  }

  const { data, isLoading } = useAdminUsers({ q: search || undefined, role: roleFilter });
  const updateStatus = useUpdateUserStatus();

  const users = data?.users ?? [];

  // Filtered locally for responsiveness
  const filtered = users.filter(u => {
    if (!isSuperAdmin && u.isSuperAdmin) return false; // owner cannot see super admins
    if (!isSuperAdmin && !isOwner && (u.isAdmin || u.isSuperAdmin)) return false; // staff cannot see admins
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-black tracking-tight">User Management</h2>
          <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? 'Full access — all accounts visible.' : isOwner ? 'Owner access — customers and staff visible (super admins hidden).' : 'Staff access — customer accounts only, read-only.'}
          </p>
        </div>
        {(isSuperAdmin || isOwner || currentUser?.isAdmin) && (
          <Button
            onClick={() => setNotifModal({ broadcast: true })}
            className="gap-2 shadow-sm flex-shrink-0"
            variant="outline"
          >
            <Megaphone className="w-4 h-4" /> Broadcast Notification
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
          />
        </div>
        <div className="flex gap-2">
          {(['customer', 'staff', ...(isSuperAdmin || isOwner ? ['all'] : [])] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${roleFilter === r ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
            >
              {r === 'all' ? 'All' : r === 'customer' ? 'Customers' : 'Staff'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{filtered.length}</span> accounts shown
        {search && <span>· filtered by "<span className="font-medium text-primary">{search}</span>"</span>}
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground">No users found{search ? ` for "${search}"` : ''}.</p>
          </CardContent>
        </Card>
      ) : (
        <motion.div className="space-y-2" variants={stagger} initial="hidden" animate="visible">
          {filtered.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              expanded={expandedId === user.id}
              onToggle={() => setExpandedId(expandedId === user.id ? null : user.id)}
              canSuspend={canSuspend}
              canDelete={canDelete}
              canNotify={!!(isSuperAdmin || isOwner || currentUser?.isAdmin)}
              onSuspend={() => setConfirmAction({ userId: user.id, isActive: false, name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email })}
              onActivate={() => setConfirmAction({ userId: user.id, isActive: true, name: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email })}
              onDelete={() => setDeleteConfirm(user.id)}
              onSendNotif={() => setNotifModal({ userId: user.id, userName: user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email })}
            />
          ))}
        </motion.div>
      )}

      {/* Confirm suspend/activate modal */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-5"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${confirmAction.isActive ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {confirmAction.isActive ? <UserCheck className="w-7 h-7 text-emerald-600" /> : <UserX className="w-7 h-7 text-amber-600" />}
              </div>
              <p className="text-center font-bold text-lg">{confirmAction.isActive ? 'Activate Account?' : 'Suspend Account?'}</p>
              <p className="text-center text-sm text-muted-foreground">
                {confirmAction.isActive ? `Restore access for ${confirmAction.name}` : `Block ${confirmAction.name} from logging in`}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>Cancel</Button>
                <Button
                  className={`flex-1 ${!confirmAction.isActive ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  disabled={updateStatus.isPending}
                  onClick={async () => {
                    await updateStatus.mutateAsync({ userId: confirmAction.userId, isActive: confirmAction.isActive });
                    setConfirmAction(null);
                  }}
                >
                  {updateStatus.isPending ? 'Saving...' : confirmAction.isActive ? 'Activate' : 'Suspend'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Send Notification modal */}
      <AnimatePresence>
        {notifModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-background rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-5"
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  {notifModal.broadcast ? <Megaphone className="w-6 h-6 text-blue-600" /> : <Send className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <p className="font-bold text-lg">{notifModal.broadcast ? 'Broadcast to All Customers' : `Notify ${notifModal.userName}`}</p>
                  <p className="text-xs text-muted-foreground">{notifModal.broadcast ? 'Sends in-app + email to all active customers' : 'Sends in-app notification + optional email'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Title *</label>
                  <input
                    value={notifTitle}
                    onChange={e => setNotifTitle(e.target.value)}
                    placeholder="e.g. Special offer just for you!"
                    className="w-full h-10 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Message *</label>
                  <textarea
                    value={notifMessage}
                    onChange={e => setNotifMessage(e.target.value)}
                    placeholder="Your message here..."
                    rows={3}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={notifSendEmail} onChange={e => setNotifSendEmail(e.target.checked)} className="accent-primary" />
                  Also send email notification
                </label>
              </div>
              {notifError && <p className="text-xs text-destructive">{notifError}</p>}
              {notifSuccess && <p className="text-xs text-emerald-600 font-semibold">{notifSuccess}</p>}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setNotifModal(null); setNotifTitle(''); setNotifMessage(''); setNotifError(''); setNotifSuccess(''); }}>Cancel</Button>
                <Button className="flex-1 gap-2" disabled={sendNotif.isPending} onClick={handleSendNotif}>
                  <Send className="w-4 h-4" />{sendNotif.isPending ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm delete modal */}
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
              <p className="text-center font-bold text-lg">Delete Account?</p>
              <p className="text-center text-sm text-muted-foreground">This cannot be undone. All orders and data are retained for compliance.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" className="flex-1" onClick={() => setDeleteConfirm(null)}>Delete</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserRow({ user, expanded, onToggle, canSuspend, canDelete, onSuspend, onActivate, onDelete, onSendNotif, canNotify }: {
  user: AdminUser;
  expanded: boolean;
  onToggle: () => void;
  canSuspend: boolean;
  canDelete: boolean;
  onSuspend: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onSendNotif: () => void;
  canNotify: boolean;
}) {
  const tierCfg = TIER_CONFIG[user.loyaltyTier ?? 'Member'] ?? TIER_CONFIG.Member;
  const TierIcon = tierCfg.icon;
  const initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || user.email[0].toUpperCase();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  return (
    <motion.div variants={rowVariants} className="overflow-hidden">
      <Card className={`transition-all duration-300 ${!user.isActive ? 'opacity-60' : ''} ${expanded ? 'shadow-lg ring-1 ring-primary/20' : 'hover:shadow-md'}`}>
        <CardContent className="p-4">
          {/* Main row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${user.isAdmin || user.isSuperAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{fullName}</span>
                {user.isSuperAdmin && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-primary text-primary-foreground">SUPER ADMIN</span>
                )}
                {user.isAdmin && !user.isSuperAdmin && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white">ADMIN</span>
                )}
                {!user.isActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">SUSPENDED</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate block">{user.email}</span>
            </div>

            {/* Loyalty tier */}
            <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tierCfg.bg} ${tierCfg.text}`}>
              <TierIcon className="w-3 h-3" /> {tierCfg.label}
            </span>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {user.totalOrders ?? 0} orders</span>
              <span>{user.loyaltyPoints ?? 0} pts</span>
            </div>

            {/* Joined */}
            <span className="hidden lg:block text-xs text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
              {canNotify && !user.isAdmin && !user.isSuperAdmin && (
                <button onClick={onSendNotif} title="Send notification" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Send className="w-4 h-4" /></button>
              )}
              {canSuspend && !user.isAdmin && !user.isSuperAdmin && (
                user.isActive
                  ? <button onClick={onSuspend} title="Suspend" className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"><ShieldOff className="w-4 h-4" /></button>
                  : <button onClick={onActivate} title="Activate" className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"><Shield className="w-4 h-4" /></button>
              )}
              {canDelete && !user.isAdmin && !user.isSuperAdmin && (
                <button onClick={onDelete} title="Delete" className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              )}
              <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Expanded detail */}
          <AnimatePresence initial={false}>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <UserDetail userId={user.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const { data, isLoading } = useAdminUserDetail(userId, true);

  if (isLoading) return (
    <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
      {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
    </div>
  );

  if (!data) return null;

  return (
    <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Contact */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Contact</p>
        <div className="space-y-1.5 text-sm">
          <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-primary/70" /> <span className="truncate">{data.email}</span></div>
          {data.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-primary/70" /> {data.phone}</div>}
          {data.addresses?.[0] && (
            <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-primary/70 mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground text-xs">{data.addresses[0].line1}, {data.addresses[0].city}, {data.addresses[0].postcode}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recent orders */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recent Orders</p>
        {data.orders.length === 0 ? (
          <p className="text-xs text-muted-foreground">No orders yet</p>
        ) : data.orders.slice(0, 3).map(o => (
          <div key={o.id} className="flex items-center justify-between text-xs">
            <span className="font-mono font-semibold">{o.orderNumber}</span>
            <span className={`px-2 py-0.5 rounded-full font-bold ${o.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' : o.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
              {o.status.replace(/_/g, ' ')}
            </span>
            <span className="text-muted-foreground">£{(o.totalMinor / 100).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Loyalty */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loyalty</p>
        <div className="bg-primary/5 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tier</span>
            <span className="text-xs font-bold text-primary">{data.loyalty?.tier ?? 'Member'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Points</span>
            <span className="text-sm font-black">{data.loyalty?.pointsBalance ?? 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Member since</span>
            <span className="text-xs">{new Date(data.createdAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
