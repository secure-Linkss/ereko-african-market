'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  LayoutDashboard, ShoppingBag, Package,
  Search, PackageCheck, AlertCircle,
  RefreshCcw, LogOut, Banknote, RotateCcw, MessageSquare, Mail, CheckCircle2,
  Star, Trash2, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { useAdminMetrics, useAdminOrders, useAdminInventory, useAdminReturns, useResolveRma, useAdminContacts, useMarkContactRead, useUpdateOrderStatus } from '@/services/admin';
import { useAdminReviews, useModerateReview, useDeleteReview } from '@/services/reviews';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@/services/auth';

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: 'bg-amber-100 text-amber-800',
  PAID: 'bg-blue-100 text-blue-800',
  ALLOCATED: 'bg-blue-100 text-blue-800',
  PICKING: 'bg-indigo-100 text-indigo-800',
  PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  OUT_FOR_DELIVERY: 'bg-amber-100 text-amber-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-gray-100 text-gray-700',
  RETURN_REQUESTED: 'bg-orange-100 text-orange-800',
};

type Tab = 'dashboard' | 'orders' | 'inventory' | 'returns' | 'contacts' | 'reviews';

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [orderSearch, setOrderSearch] = useState('');

  const { user, isAuthenticated } = useAuthStore();
  const { data: metrics } = useAdminMetrics();
  const logoutMutation = useLogout();

  if (!isAuthenticated || !user?.isAdmin) {
    router.push(`/${locale}/login`);
    return null;
  }

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    router.push(`/${locale}`);
  }

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'A';

  function NavItem({ tab, icon: Icon, label, badge }: { tab: Tab; icon: any; label: string; badge?: string; badgeColor?: string }) {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full text-left transition-colors font-medium ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>{badge}</span>}
      </button>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/20">

      {/* Admin Sidebar */}
      <aside className="w-64 bg-background border-r border-border flex flex-col hidden lg:flex flex-shrink-0">
        <div className="p-6 border-b border-border">
          <img src="/logo.jpeg" alt="Ereko Logo" className="h-10 mb-2 rounded-full border-2 border-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Admin Console</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem tab="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem tab="orders" icon={ShoppingBag} label="Orders" />
          <NavItem tab="inventory" icon={Package} label="Inventory" />
          <NavItem tab="returns" icon={RefreshCcw} label="Returns" />
          <NavItem tab="contacts" icon={MessageSquare} label="Messages" badge={metrics?.unreadContactsCount ? String(metrics.unreadContactsCount) : undefined} />
          <NavItem tab="reviews" icon={Star} label="Reviews" />
        </nav>
        <div className="p-4 border-t border-border space-y-1">
          <Link href={`/${locale}`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors text-sm">
            <ShoppingBag className="w-4 h-4" /> View Store
          </Link>
          <button onClick={handleLogout} disabled={logoutMutation.isPending} className="flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto">
            {(['dashboard', 'orders', 'inventory', 'returns', 'contacts', 'reviews'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`lg:hidden px-3 py-1.5 rounded-lg text-sm font-medium capitalize whitespace-nowrap ${activeTab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {t}
              </button>
            ))}
            <div className="hidden lg:flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders, products, customers..."
                className="bg-transparent border-none focus:outline-none w-full max-w-md text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm flex-shrink-0">{initials}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
          {activeTab === 'dashboard' && <DashboardTab locale={locale} onNavigate={setActiveTab} />}
          {activeTab === 'orders' && <OrdersTab locale={locale} search={orderSearch} />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'returns' && <ReturnsTab />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
        </div>
      </main>
    </div>
  );
}

function DashboardTab({ locale, onNavigate }: { locale: string; onNavigate: (tab: Tab) => void }) {
  const { data: metrics, isLoading } = useAdminMetrics();
  const { data: ordersData } = useAdminOrders({ limit: 5 });
  const orders = ordersData?.orders ?? [];

  const kpis = [
    {
      label: 'Today\'s Revenue',
      value: metrics ? `£${((metrics.todayRevenueMinor ?? 0) / 100).toFixed(2)}` : '£0.00',
      icon: Banknote,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    },
    {
      label: 'Today\'s Orders',
      value: metrics?.todayOrdersCount ?? 0,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
    },
    {
      label: 'Pending Returns',
      value: metrics?.pendingRefundsCount ?? 0,
      icon: RotateCcw,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
    },
    {
      label: 'Low Stock Alerts',
      value: metrics?.lowStockItemsCount ?? 0,
      icon: AlertCircle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Overview</h2>
        <span className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
              {isLoading ? <Skeleton className="h-8 w-20" /> : <p className={`text-2xl font-bold ${kpi.label === 'Low Stock Alerts' ? 'text-destructive' : ''}`}>{kpi.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onNavigate('orders')}>View All</Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-muted-foreground">No orders yet</td></tr>
                ) : orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium">{order.orderNumber}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">£{((order.totalMinor ?? 0) / 100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Action Required</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(metrics?.pendingRefundsCount ?? 0) > 0 && (
              <div className="flex gap-3 items-start p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <RotateCcw className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900 dark:text-amber-400">{metrics!.pendingRefundsCount} Pending Returns</p>
                  <button onClick={() => onNavigate('returns')} className="text-xs text-amber-600 hover:underline mt-1">Review now →</button>
                </div>
              </div>
            )}
            {(metrics?.lowStockItemsCount ?? 0) > 0 && (
              <div className="flex gap-3 items-start p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-destructive">{metrics!.lowStockItemsCount} Low Stock Items</p>
                  <button onClick={() => onNavigate('inventory')} className="text-xs text-destructive hover:underline mt-1">Check inventory →</button>
                </div>
              </div>
            )}
            {(metrics?.webhookFailuresCount ?? 0) > 0 && (
              <div className="flex gap-3 items-start p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-orange-800">{metrics!.webhookFailuresCount} Webhook Failures</p>
                  <p className="text-xs text-orange-600 mt-1">Check webhook logs</p>
                </div>
              </div>
            )}
            {!metrics || (metrics.pendingRefundsCount === 0 && metrics.lowStockItemsCount === 0 && metrics.webhookFailuresCount === 0) ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                All systems operational
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function OrdersTab({ locale, search }: { locale: string; search: string }) {
  const [statusFilter, setStatusFilter] = useState('');
  const updateStatus = useUpdateOrderStatus();
  const { data, isLoading } = useAdminOrders({ limit: 20, status: statusFilter || undefined, searchQuery: search || undefined });
  const orders = data?.orders ?? [];

  const statuses = ['', 'PENDING_PAYMENT', 'PAID', 'ALLOCATED', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Orders</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {statuses.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Order</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={6} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">No orders found</td></tr>
              ) : orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-4 font-medium">{order.orderNumber}</td>
                  <td className="px-5 py-4 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="px-5 py-4 text-muted-foreground">{order.email ?? '—'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{order.items?.length ?? '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {order.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold">£{((order.totalMinor ?? 0) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function InventoryTab() {
  const { data, isLoading } = useAdminInventory(50);
  const items = data?.items ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold">Inventory</h2>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Warehouse</th>
                <th className="px-5 py-3 font-medium text-center">On Hand</th>
                <th className="px-5 py-3 font-medium text-center">Reserved</th>
                <th className="px-5 py-3 font-medium text-center">Available</th>
                <th className="px-5 py-3 font-medium text-center">Safety Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}><td colSpan={7} className="px-5 py-4"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No inventory items found</td></tr>
              ) : items.map((item: any) => {
                const available = item.onHand - item.reserved - (item.damaged ?? 0);
                const lowStock = available <= item.safetyStock;
                return (
                  <tr key={item.id} className={`hover:bg-muted/20 transition-colors ${lowStock ? 'bg-destructive/5' : ''}`}>
                    <td className="px-5 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-5 py-3 font-medium">{item.title} <span className="text-muted-foreground text-xs">({item.variantName})</span></td>
                    <td className="px-5 py-3 text-muted-foreground">{item.warehouseName}</td>
                    <td className="px-5 py-3 text-center">{item.onHand}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{item.reserved}</td>
                    <td className={`px-5 py-3 text-center font-bold ${lowStock ? 'text-destructive' : 'text-emerald-600'}`}>{available}</td>
                    <td className="px-5 py-3 text-center text-muted-foreground">{item.safetyStock}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

function ReturnsTab() {
  const { data: returns, isLoading } = useAdminReturns();
  const resolveRma = useResolveRma();

  const items = returns ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold">Returns & Refunds</h2>
      <div className="space-y-4">
        {isLoading ? (
          [1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500" />
            <p>No pending returns</p>
          </div>
        ) : items.map((rma: any) => (
          <Card key={rma.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold">{rma.orderNumber} <span className={`ml-2 text-xs font-bold px-2 py-1 rounded uppercase ${rma.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' : rma.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{rma.status?.replace(/_/g, ' ')}</span></p>
                <p className="text-sm text-muted-foreground mt-1">{rma.customerEmail} · Reason: {rma.reasonCode?.replace(/_/g, ' ')}</p>
                <p className="text-sm font-semibold mt-1">Refund: £{((rma.refundAmountMinor ?? 0) / 100).toFixed(2)}</p>
              </div>
              {rma.status === 'PENDING_REVIEW' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    disabled={resolveRma.isPending}
                    onClick={() => resolveRma.mutate({ rmaId: rma.id, action: 'approve' })}
                  >Approve</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={resolveRma.isPending}
                    onClick={() => resolveRma.mutate({ rmaId: rma.id, action: 'reject', reason: 'Rejected by admin' })}
                  >Reject</Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function ReviewsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: reviews, isLoading } = useAdminReviews(statusFilter || undefined, 100);
  const moderate = useModerateReview();
  const deleteReview = useDeleteReview();
  const items = reviews ?? [];

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };

  function StarRow({ rating }: { rating: number }) {
    return (
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map((s) => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Reviews</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', key: 'pending', color: 'text-amber-600 bg-amber-50', count: items.filter((r: any) => r.status === 'pending').length },
          { label: 'Approved', key: 'approved', color: 'text-emerald-600 bg-emerald-50', count: items.filter((r: any) => r.status === 'approved').length },
          { label: 'Rejected', key: 'rejected', color: 'text-red-600 bg-red-50', count: items.filter((r: any) => r.status === 'rejected').length },
        ].map((stat) => (
          <Card key={stat.key}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color.split(' ')[0]}`}>{stat.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p>No reviews found</p>
          </div>
        ) : items.map((review: any) => (
          <Card key={review.id} className={review.status === 'pending' ? 'border-amber-300/50 bg-amber-50/30' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[review.status]}`}>
                      {review.status}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${review.source === 'google' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {review.source}
                    </span>
                    <StarRow rating={review.rating} />
                  </div>
                  <p className="font-bold text-sm">{review.author_name}</p>
                  {review.author_email && (
                    <p className="text-xs text-muted-foreground">{review.author_email}</p>
                  )}
                  <p className="text-sm text-foreground mt-2 leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {review.status !== 'approved' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs gap-1"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: review.id, action: 'approve' })}
                    >
                      <ThumbsUp className="w-3 h-3" /> Approve
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs gap-1"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate({ id: review.id, action: 'reject' })}
                    >
                      <ThumbsDown className="w-3 h-3" /> Reject
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs gap-1"
                    disabled={deleteReview.isPending}
                    onClick={() => {
                      if (confirm('Delete this review permanently?')) {
                        deleteReview.mutate(review.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function ContactsTab() {
  const { data: contacts, isLoading } = useAdminContacts();
  const markRead = useMarkContactRead();
  const items = contacts ?? [];

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Contact Messages</h2>
        <span className="text-sm text-muted-foreground">{items.filter((c: any) => !c.isRead).length} unread</span>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
            <p>No contact messages yet</p>
          </div>
        ) : items.map((msg: any) => (
          <Card key={msg.id} className={!msg.isRead ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!msg.isRead && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                    <p className="font-bold text-sm">{msg.name}</p>
                    <a href={`mailto:${msg.email}`} className="text-xs text-primary hover:underline">{msg.email}</a>
                    {msg.phone && <span className="text-xs text-muted-foreground">{msg.phone}</span>}
                  </div>
                  <p className="font-semibold text-sm mb-2">{msg.subject}</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(msg.createdAt).toLocaleString('en-GB')}</p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {!msg.isRead && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      disabled={markRead.isPending}
                      onClick={() => markRead.mutate(msg.id)}
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Mark read
                    </Button>
                  )}
                  <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}>
                    <Button variant="outline" size="sm" className="text-xs w-full">
                      <Mail className="w-3 h-3 mr-1" /> Reply
                    </Button>
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
