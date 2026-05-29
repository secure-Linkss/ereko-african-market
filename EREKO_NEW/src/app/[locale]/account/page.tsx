'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Input } from '@/components/ui/Input';
import {
  User, Package, MapPin, CreditCard, Heart, LogOut,
  Star, TrendingUp, RefreshCw, ChevronRight, Settings,
  ShoppingBag, CheckCircle2, Clock, Truck, Edit2, Save, X, PackageSearch,
} from 'lucide-react';
import { useProfile, useLogout } from '@/services/auth';
import { useOrders } from '@/services/orders';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient, API_ENDPOINTS } from '@/lib/api/client';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  phone: z.string().optional(),
  marketingEmailOptIn: z.boolean(),
});
type ProfileForm = z.infer<typeof profileSchema>;

const ORDER_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING_PAYMENT: { label: 'Pending Payment', color: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paid', color: 'bg-blue-100 text-blue-800' },
  ALLOCATED: { label: 'Processing', color: 'bg-blue-100 text-blue-800' },
  PICKING: { label: 'Picking', color: 'bg-indigo-100 text-indigo-800' },
  PACKED: { label: 'Packed', color: 'bg-indigo-100 text-indigo-800' },
  SHIPPED: { label: 'Shipped', color: 'bg-violet-100 text-violet-800' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'bg-amber-100 text-amber-800' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
};

const TIER_NEXT: Record<string, { next: string; required: number }> = {
  Member: { next: 'Family', required: 500 },
  Family: { next: 'Elder', required: 1500 },
  Elder: { next: 'Royalty', required: 5000 },
  Royalty: { next: 'Royalty', required: 9999 },
};

export default function AccountPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'profile'>('dashboard');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const { isAuthenticated, user } = useAuthStore();
  const logoutMutation = useLogout();
  const clearCart = useCartStore((s) => s.clearCart);

  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: ordersData, isLoading: ordersLoading } = useOrders(5);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.firstName ?? '',
      lastName: profile?.lastName ?? '',
      phone: profile?.phone ?? '',
      marketingEmailOptIn: profile?.marketingEmailOptIn ?? false,
    },
  });

  if (!isAuthenticated && !profileLoading) {
    router.push(`/${locale}/login`);
    return null;
  }

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    clearCart();
    router.push(`/${locale}`);
  }

  async function handleSaveProfile(data: ProfileForm) {
    setProfileSaveError('');
    setProfileSaving(true);
    try {
      await apiClient.patch(API_ENDPOINTS.PROFILE.ME, data);
      await refetchProfile();
      setEditingProfile(false);
    } catch (err: any) {
      setProfileSaveError(err?.response?.data?.detail ?? 'Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  }

  const loyaltyPoints = profile?.loyaltyPointsBalance ?? 0;
  const tier = profile?.loyaltyTier ?? 'Member';
  const tierInfo = TIER_NEXT[tier] ?? TIER_NEXT.Member;
  const progressPct = tier === 'Royalty' ? 100 : Math.min(100, Math.round((loyaltyPoints / tierInfo.required) * 100));
  const orders = ordersData?.orders ?? [];

  const displayName = profile ? `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() : (user?.firstName ?? '');
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  function NavItem({ tab, icon: Icon, label }: { tab: typeof activeTab; icon: any; label: string }) {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-3 p-3 rounded-lg w-full text-left transition-colors ${active ? 'bg-primary text-primary-foreground font-medium' : 'text-foreground hover:bg-muted/50'}`}
      >
        <Icon className="w-5 h-5" /> {label}
      </button>
    );
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">

      {/* Sidebar */}
      <aside className="w-full lg:w-64 flex-shrink-0">
        <Card className="border shadow-sm">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-3 p-4 mb-4 bg-muted/30 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold truncate">{displayName || 'Loading...'}</p>
                <p className="text-xs text-muted-foreground capitalize">{tier} Member</p>
              </div>
            </div>

            <NavItem tab="dashboard" icon={User} label="Dashboard" />
            <NavItem tab="orders" icon={Package} label="Orders & Returns" />
            <NavItem tab="profile" icon={Settings} label="My Profile" />
            <Link href={`/${locale}/shop`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors w-full">
              <Heart className="w-5 h-5 text-muted-foreground" /> Wishlist
            </Link>

            <div className="pt-4 mt-2 border-t border-border">
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors w-full text-left"
              >
                <LogOut className="w-5 h-5" /> {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 space-y-8 min-w-0">

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {profile?.firstName ?? user?.firstName ?? ''}!
            </h1>

            {/* Loyalty Banner */}
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <div className="flex-1 space-y-2 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                  <h2 className="text-xl font-bold">Ereko Rewards — {tier}</h2>
                </div>
                {tier !== 'Royalty' ? (
                  <p className="text-muted-foreground">
                    You are <span className="font-bold text-foreground">{Math.max(0, tierInfo.required - loyaltyPoints).toLocaleString()} points</span> away from {tierInfo.next}!
                  </p>
                ) : (
                  <p className="text-muted-foreground font-semibold text-primary">You've reached the top tier — Royalty!</p>
                )}
                <div className="w-full bg-background rounded-full h-3 mt-4 border border-border">
                  <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{tier}</span>
                  <span>{tier !== 'Royalty' ? tierInfo.next : '★ Max'}</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-background p-4 rounded-xl border border-border min-w-[120px]">
                {profileLoading ? <Skeleton className="h-10 w-16" /> : <span className="text-3xl font-bold text-primary">{loyaltyPoints.toLocaleString()}</span>}
                <span className="text-xs font-medium uppercase tracking-wider mt-1">Points</span>
              </div>
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Recent Orders</CardTitle>
                <button onClick={() => setActiveTab('orders')} className="text-sm text-primary hover:underline">View all</button>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    <p>No orders yet. <Link href={`/${locale}/shop`} className="text-primary hover:underline">Start shopping!</Link></p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 3).map((order: any) => {
                      const status = ORDER_STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                      return (
                        <Link key={order.id} href={`/${locale}/account/orders/${order.id}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-primary transition-colors group">
                          <div>
                            <p className="font-bold text-sm">{order.orderNumber}</p>
                            <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB')} • {order.items?.length ?? '?'} items</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${status.color}`}>{status.label}</span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Link href={`/${locale}/shop`}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <ShoppingBag className="w-8 h-8 text-primary" />
                    <p className="font-semibold text-sm">Browse Shop</p>
                  </CardContent>
                </Card>
              </Link>
              <button onClick={() => setActiveTab('orders')}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full w-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Package className="w-8 h-8 text-primary" />
                    <p className="font-semibold text-sm">My Orders</p>
                  </CardContent>
                </Card>
              </button>
              <button onClick={() => setActiveTab('profile')}>
                <Card className="hover:border-primary transition-colors cursor-pointer h-full w-full">
                  <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                    <Settings className="w-8 h-8 text-primary" />
                    <p className="font-semibold text-sm">Edit Profile</p>
                  </CardContent>
                </Card>
              </button>
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <>
            <h1 className="text-3xl font-bold tracking-tight">Orders & Returns</h1>
            {ordersLoading ? (
              <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground opacity-40" />
                <h3 className="text-xl font-bold">No orders yet</h3>
                <p className="text-muted-foreground">Your orders will appear here once you've made a purchase.</p>
                <Link href={`/${locale}/shop`}><Button>Start shopping</Button></Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order: any) => {
                  const status = ORDER_STATUS_LABEL[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-700' };
                  return (
                    <Card key={order.id} className="overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 border-b border-border bg-muted/20">
                        <div>
                          <p className="font-bold">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">£{((order.totalMinor ?? 0) / 100).toFixed(2)}</span>
                          <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${status.color}`}>{status.label}</span>
                        </div>
                      </div>
                      <CardContent className="p-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''}</p>
                        <div className="flex gap-2">
                          <Link href={`/${locale}/track?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(profile?.email ?? '')}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                              <PackageSearch className="w-3.5 h-3.5" /> Track
                            </Button>
                          </Link>
                          <Link href={`/${locale}/account/orders/${order.id}`}>
                            <Button variant="outline" size="sm">Details</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
              {!editingProfile && (
                <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-6">
                {profileLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-6 w-2/3" />
                  </div>
                ) : editingProfile ? (
                  <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-5">
                    {profileSaveError && (
                      <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
                        {profileSaveError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-semibold mb-1 block">First Name</label>
                        <Input {...form.register('firstName')} />
                        {form.formState.errors.firstName && <p className="text-xs text-destructive mt-1">{form.formState.errors.firstName.message}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-semibold mb-1 block">Last Name</label>
                        <Input {...form.register('lastName')} />
                        {form.formState.errors.lastName && <p className="text-xs text-destructive mt-1">{form.formState.errors.lastName.message}</p>}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Email</label>
                      <Input value={profile?.email ?? ''} disabled className="opacity-60" />
                      <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here</p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-1 block">Phone (optional)</label>
                      <Input type="tel" placeholder="+44 7700 000000" {...form.register('phone')} />
                    </div>
                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="rounded text-primary w-4 h-4" {...form.register('marketingEmailOptIn')} />
                        <span className="text-sm">Receive news & exclusive offers by email</span>
                      </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <Button type="submit" disabled={profileSaving}>
                        {profileSaving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => { setEditingProfile(false); form.reset(); setProfileSaveError(''); }}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">First Name</p>
                        <p className="font-semibold">{profile?.firstName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Name</p>
                        <p className="font-semibold">{profile?.lastName || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                        <p className="font-semibold">{profile?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p>
                        <p className="font-semibold">{profile?.phone || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Loyalty Tier</p>
                        <p className="font-semibold capitalize">{profile?.loyaltyTier || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Member Since</p>
                        <p className="font-semibold">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—'}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Preferences</p>
                      <p className="text-sm">
                        Marketing emails: <span className="font-semibold">{profile?.marketingEmailOptIn ? 'Subscribed' : 'Not subscribed'}</span>
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change password link */}
            <Card>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Password</p>
                  <p className="text-sm text-muted-foreground">Change your account password</p>
                </div>
                <Link href={`/${locale}/login`}>
                  <Button variant="outline" size="sm">Change Password</Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
