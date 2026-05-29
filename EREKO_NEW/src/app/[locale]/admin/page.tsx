'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  LayoutDashboard, ShoppingBag, Package, Search, PackageCheck, AlertCircle,
  RefreshCcw, LogOut, Banknote, RotateCcw, MessageSquare, Mail, CheckCircle2,
  Star, Trash2, ThumbsUp, ThumbsDown, Edit2, Plus, Truck, Ship, Plane,
  Upload, X, ChevronDown, ChevronUp, Save, ImageIcon, Tag,
} from 'lucide-react';
import {
  useAdminMetrics, useAdminOrders, useAdminInventory, useUpdateStock,
  useAdminReturns, useResolveRma, useAdminContacts, useMarkContactRead,
  useUpdateOrderStatus, useAdminProducts, useCreateProduct, useUpdateProduct,
  useDeleteProduct, useUploadProductImage, useAdminCargoRates, useUpdateCargoRate,
  UpdateProductRequest, CreateProductRequest,
} from '@/services/admin';
import { useAdminReviews, useModerateReview, useDeleteReview } from '@/services/reviews';
import { useAuthStore } from '@/store/auth';
import { useLogout } from '@/services/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
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
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
};

const NEXT_STATUSES: Record<string, string[]> = {
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['ALLOCATED', 'ON_HOLD', 'CANCELLED'],
  ALLOCATED: ['PICKING', 'ON_HOLD', 'CANCELLED'],
  PICKING: ['PACKED', 'ON_HOLD', 'CANCELLED'],
  PACKED: ['SHIPPED', 'ON_HOLD', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'ON_HOLD'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'ON_HOLD'],
  DELIVERED: ['RETURN_REQUESTED'],
  ON_HOLD: ['PAID', 'ALLOCATED', 'PICKING', 'PACKED', 'CANCELLED'],
};

type Tab = 'dashboard' | 'orders' | 'inventory' | 'products' | 'returns' | 'contacts' | 'reviews' | 'cargo-rates';

// ─── Root Page ─────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [orderSearch, setOrderSearch] = useState('');
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const { data: metrics } = useAdminMetrics();
  const logoutMutation = useLogout();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    router.push(`/${locale}/login`);
    return null;
  }

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    router.push(`/${locale}`);
  }

  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() : 'A';

  const NAV_ITEMS: { tab: Tab; icon: any; label: string; badge?: string }[] = [
    { tab: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { tab: 'orders', icon: ShoppingBag, label: 'Orders' },
    { tab: 'inventory', icon: Package, label: 'Inventory' },
    { tab: 'products', icon: Tag, label: 'Products' },
    { tab: 'returns', icon: RefreshCcw, label: 'Returns', badge: metrics?.pendingRefundsCount ? String(metrics.pendingRefundsCount) : undefined },
    { tab: 'contacts', icon: MessageSquare, label: 'Messages', badge: metrics?.unreadContactsCount ? String(metrics.unreadContactsCount) : undefined },
    { tab: 'reviews', icon: Star, label: 'Reviews' },
    { tab: 'cargo-rates', icon: Truck, label: 'Cargo Rates' },
  ];

  return (
    <div className="flex h-screen bg-muted/20 overflow-hidden">

      {/* Sidebar — fixed, flex-col, hidden below lg */}
      <aside className="w-64 bg-background border-r border-border flex-col flex-shrink-0 hidden lg:flex">
        <div className="p-5 border-b border-border">
          <img src="/logo.jpeg" alt="EREKO" className="h-10 mb-1.5 rounded-full border-2 border-primary" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Admin Console</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ tab, icon: Icon, label, badge }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-colors text-sm font-medium ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-0.5">
          <Link href={`/${locale}`} className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-lg transition-colors text-sm">
            <ShoppingBag className="w-4 h-4" /> View Store
          </Link>
          <button onClick={handleLogout} disabled={logoutMutation.isPending} className="flex items-center gap-3 px-3 py-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors w-full text-left text-sm">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 flex-shrink-0 gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto flex-1 min-w-0">
            {NAV_ITEMS.map(({ tab, label }) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`lg:hidden px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {label}
              </button>
            ))}
            <div className="hidden lg:flex items-center gap-2 flex-1">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search orders..."
                className="bg-transparent border-none focus:outline-none w-full max-w-sm text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{initials}</div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {activeTab === 'dashboard' && <DashboardTab locale={locale} onNavigate={setActiveTab} metrics={metrics} />}
          {activeTab === 'orders' && <OrdersTab search={orderSearch} />}
          {activeTab === 'inventory' && <InventoryTab />}
          {activeTab === 'products' && <ProductsTab />}
          {activeTab === 'returns' && <ReturnsTab />}
          {activeTab === 'contacts' && <ContactsTab />}
          {activeTab === 'reviews' && <ReviewsTab />}
          {activeTab === 'cargo-rates' && <CargoRatesTab />}
        </div>
      </main>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardTab({ locale, onNavigate, metrics }: { locale: string; onNavigate: (t: Tab) => void; metrics: any }) {
  const { data: ordersData } = useAdminOrders({ limit: 5 });
  const orders = ordersData?.orders ?? [];
  const isLoading = !metrics;

  const kpis = [
    { label: "Today's Revenue", value: metrics ? `£${((metrics.todayRevenueMinor ?? 0) / 100).toFixed(2)}` : '—', icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: "Today's Orders", value: metrics?.todayOrdersCount ?? '—', icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Returns', value: metrics?.pendingRefundsCount ?? '—', icon: RotateCcw, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Low Stock Alerts', value: metrics?.lowStockItemsCount ?? '—', icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
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
            <CardContent className="p-4">
              <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <kpi.icon className={`w-4.5 h-4.5 ${kpi.color}`} />
              </div>
              <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
              {isLoading ? <Skeleton className="h-7 w-16" /> : <p className={`text-2xl font-bold ${kpi.label === 'Low Stock Alerts' ? 'text-destructive' : ''}`}>{kpi.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Button variant="outline" size="sm" onClick={() => onNavigate('orders')}>View All</Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Order</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground text-xs">No orders yet</td></tr>
                ) : orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-700'}`}>{o.status?.replace(/_/g,' ')}</span></td>
                    <td className="px-4 py-3 text-right font-medium">£{((o.totalMinor ?? 0)/100).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-4"><CardTitle className="text-base">Action Required</CardTitle></CardHeader>
          <CardContent className="space-y-2.5">
            {metrics?.pendingRefundsCount > 0 && (
              <div className="flex gap-2.5 items-start p-3 bg-amber-50 rounded-lg border border-amber-200">
                <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">{metrics.pendingRefundsCount} Pending Returns</p>
                  <button onClick={() => onNavigate('returns')} className="text-xs text-amber-600 hover:underline">Review →</button>
                </div>
              </div>
            )}
            {metrics?.lowStockItemsCount > 0 && (
              <div className="flex gap-2.5 items-start p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-destructive">{metrics.lowStockItemsCount} Low Stock Items</p>
                  <button onClick={() => onNavigate('inventory')} className="text-xs text-destructive hover:underline">Check inventory →</button>
                </div>
              </div>
            )}
            {(!metrics || (metrics.pendingRefundsCount === 0 && metrics.lowStockItemsCount === 0)) && (
              <div className="text-center py-6 text-muted-foreground text-xs">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />All systems operational
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────────

function OrdersTab({ search }: { search: string }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<{ orderId: string; status: string; trackingNumber: string; carrierName: string; notes: string } | null>(null);
  const updateStatus = useUpdateOrderStatus();
  const { data, isLoading } = useAdminOrders({ limit: 30, status: statusFilter || undefined, searchQuery: search || undefined });
  const orders = data?.orders ?? [];

  const statuses = ['', 'PENDING_PAYMENT', 'PAID', 'ALLOCATED', 'PICKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  async function handleUpdateStatus(orderId: string) {
    if (!updating) return;
    await updateStatus.mutateAsync({
      orderId,
      status: updating.status as any,
      notes: updating.notes || undefined,
      trackingNumber: updating.trackingNumber || undefined,
      carrierName: updating.carrierName || undefined,
    });
    setUpdating(null);
    setExpandedId(null);
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Orders</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          {statuses.map((s) => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1,2,3].map((i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>)
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No orders found</td></tr>
              ) : orders.map((order: any) => {
                const isExpanded = expandedId === order.id;
                const nextStatuses = NEXT_STATUSES[order.status] ?? [];
                return (
                  <React.Fragment key={order.id}>
                    <tr className={`hover:bg-muted/20 transition-colors ${isExpanded ? 'bg-muted/10' : ''}`}>
                      <td className="px-4 py-3 font-medium font-mono text-xs">{order.orderNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                      <td className="px-4 py-3 text-xs">{order.email ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-xs">{order.items?.length ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {order.status?.replace(/_/g,' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-xs">£{((order.totalMinor ?? 0)/100).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {nextStatuses.length > 0 && (
                          <button
                            onClick={() => {
                              if (isExpanded) { setExpandedId(null); setUpdating(null); }
                              else { setExpandedId(order.id); setUpdating({ orderId: order.id, status: nextStatuses[0], trackingNumber: '', carrierName: '', notes: '' }); }
                            }}
                            className="text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && updating && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-4 bg-muted/10 border-b border-border">
                          <div className="flex flex-wrap items-end gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">New Status</label>
                              <select value={updating.status} onChange={(e) => setUpdating({ ...updating, status: e.target.value })}
                                className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                {nextStatuses.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                              </select>
                            </div>
                            {updating.status === 'SHIPPED' && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold">Carrier</label>
                                  <input value={updating.carrierName} onChange={(e) => setUpdating({ ...updating, carrierName: e.target.value })} placeholder="Royal Mail" className="h-9 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold">Tracking #</label>
                                  <input value={updating.trackingNumber} onChange={(e) => setUpdating({ ...updating, trackingNumber: e.target.value })} placeholder="AA123456789GB" className="h-9 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                                </div>
                              </>
                            )}
                            <div className="space-y-1 flex-1 min-w-40">
                              <label className="text-xs font-semibold">Notes (optional)</label>
                              <input value={updating.notes} onChange={(e) => setUpdating({ ...updating, notes: e.target.value })} placeholder="Internal note..." className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id)} disabled={updateStatus.isPending} className="gap-1">
                              <Save className="w-3.5 h-3.5" /> {updateStatus.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setExpandedId(null); setUpdating(null); }}>Cancel</Button>
                          </div>
                          {updateStatus.isError && <p className="text-xs text-destructive mt-2">Failed to update status. Check allowed transitions.</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Inventory ────────────────────────────────────────────────────────────────

function InventoryTab() {
  const { data, isLoading } = useAdminInventory(100);
  const updateStock = useUpdateStock();
  const items = data?.items ?? [];
  const [adjusting, setAdjusting] = useState<{ id: string; warehouseId: string; variantId: string } | null>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjReason, setAdjReason] = useState<'receipt'|'adjustment'|'return'|'transfer_in'|'transfer_out'>('adjustment');
  const [adjNotes, setAdjNotes] = useState('');

  async function handleAdjust() {
    if (!adjusting || !adjQty) return;
    await updateStock.mutateAsync({
      warehouseId: adjusting.warehouseId,
      variantId: adjusting.variantId,
      adjustmentQty: parseInt(adjQty, 10),
      reasonCode: adjReason,
      notes: adjNotes || undefined,
    });
    setAdjusting(null); setAdjQty(''); setAdjNotes('');
  }

  return (
    <>
      <h2 className="text-2xl font-bold">Inventory</h2>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Warehouse</th>
                <th className="px-4 py-3 font-medium text-center">On Hand</th>
                <th className="px-4 py-3 font-medium text-center">Reserved</th>
                <th className="px-4 py-3 font-medium text-center">Available</th>
                <th className="px-4 py-3 font-medium text-center">Safety</th>
                <th className="px-4 py-3 font-medium text-center">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1,2,3].map((i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>)
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No inventory items found</td></tr>
              ) : items.map((item: any) => {
                const available = item.onHand - item.reserved - (item.damaged ?? 0);
                const lowStock = available <= item.safetyStock;
                const isAdjusting = adjusting?.id === item.id;
                return (
                  <React.Fragment key={item.id}>
                    <tr className={`hover:bg-muted/20 transition-colors ${lowStock ? 'bg-destructive/5' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                      <td className="px-4 py-3 text-xs font-medium">{item.title} <span className="text-muted-foreground">({item.variantName})</span></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{item.warehouseName}</td>
                      <td className="px-4 py-3 text-center text-xs">{item.onHand}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{item.reserved}</td>
                      <td className={`px-4 py-3 text-center text-xs font-bold ${lowStock ? 'text-destructive' : 'text-emerald-600'}`}>{available}</td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground">{item.safetyStock}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => isAdjusting ? setAdjusting(null) : setAdjusting({ id: item.id, warehouseId: item.warehouseId, variantId: item.variantId })}
                          className="text-xs text-primary hover:underline">
                          {isAdjusting ? 'Cancel' : 'Adjust'}
                        </button>
                      </td>
                    </tr>
                    {isAdjusting && (
                      <tr>
                        <td colSpan={8} className="px-4 pb-4 bg-muted/10 border-b border-border">
                          <div className="flex flex-wrap items-end gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Qty (+ receive / − remove)</label>
                              <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} placeholder="e.g. +20 or -5" className="h-9 w-28 rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Reason</label>
                              <select value={adjReason} onChange={(e) => setAdjReason(e.target.value as any)}
                                className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="receipt">Receipt (stock in)</option>
                                <option value="adjustment">Manual adjustment</option>
                                <option value="return">Customer return</option>
                                <option value="transfer_in">Transfer in</option>
                                <option value="transfer_out">Transfer out</option>
                              </select>
                            </div>
                            <div className="space-y-1 flex-1 min-w-40">
                              <label className="text-xs font-semibold">Notes (optional)</label>
                              <input value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Supplier delivery note..." className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <Button size="sm" onClick={handleAdjust} disabled={!adjQty || updateStock.isPending} className="gap-1">
                              <Save className="w-3.5 h-3.5" /> {updateStock.isPending ? 'Saving...' : 'Apply'}
                            </Button>
                          </div>
                          {updateStock.isError && <p className="text-xs text-destructive mt-2">Failed to adjust stock.</p>}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Products ─────────────────────────────────────────────────────────────────

function ProductsTab() {
  const { data, isLoading } = useAdminProducts(100);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const uploadImage = useUploadProductImage();
  const products = data?.products ?? [];

  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<CreateProductRequest>>({ storageType: 'ambient', isPublished: true, originCountry: 'Nigeria' });
  const [editForm, setEditForm] = useState<Partial<UpdateProductRequest>>({});
  const [error, setError] = useState('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.title) return setError('Title is required.');
    await createProduct.mutateAsync(form as CreateProductRequest);
    setShowCreate(false);
    setForm({ storageType: 'ambient', isPublished: true, originCountry: 'Nigeria' });
  }

  async function handleUpdate(id: string) {
    await updateProduct.mutateAsync({ id, body: editForm });
    setEditId(null);
    setEditForm({});
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;
    await uploadImage.mutateAsync({ productId: uploadTarget, file });
    setUploadTarget(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Products</h2>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Product
        </Button>
      </div>

      {/* Hidden image upload input */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Create form */}
      {showCreate && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3"><CardTitle className="text-base">New Product</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Title *</label>
                <input value={form.title ?? ''} onChange={(e) => setForm({...form, title: e.target.value})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Brand</label>
                <input value={form.brand ?? ''} onChange={(e) => setForm({...form, brand: e.target.value})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Price (pence)</label>
                <input type="number" value={form.priceAmountMinor ?? ''} onChange={(e) => setForm({...form, priceAmountMinor: parseInt(e.target.value)})} placeholder="e.g. 299 = £2.99" className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Stock on Hand</label>
                <input type="number" value={form.stockOnHand ?? ''} onChange={(e) => setForm({...form, stockOnHand: parseInt(e.target.value)})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Storage Type</label>
                <select value={form.storageType ?? 'ambient'} onChange={(e) => setForm({...form, storageType: e.target.value})} className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="ambient">Ambient</option><option value="chilled">Chilled</option><option value="frozen">Frozen</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Origin Country</label>
                <input value={form.originCountry ?? ''} onChange={(e) => setForm({...form, originCountry: e.target.value})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="space-y-1 col-span-full">
                <label className="text-xs font-semibold">Short Description</label>
                <input value={form.descriptionShort ?? ''} onChange={(e) => setForm({...form, descriptionShort: e.target.value})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="pub" checked={form.isPublished ?? true} onChange={(e) => setForm({...form, isPublished: e.target.checked})} className="accent-primary" />
                <label htmlFor="pub" className="text-xs font-semibold">Published (visible in shop)</label>
              </div>
              {error && <p className="col-span-full text-xs text-destructive">{error}</p>}
              <div className="col-span-full flex gap-2">
                <Button type="submit" size="sm" disabled={createProduct.isPending}>{createProduct.isPending ? 'Creating...' : 'Create Product'}</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs">
              <tr>
                <th className="px-4 py-3 font-medium w-16">Image</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Storage</th>
                <th className="px-4 py-3 font-medium text-center">Price</th>
                <th className="px-4 py-3 font-medium text-center">Stock</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                [1,2,3].map((i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-10 w-full" /></td></tr>)
              ) : products.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No products found</td></tr>
              ) : products.map((p: any) => {
                const variant = p.variants?.[0];
                const isEditing = editId === p.id;
                return (
                  <React.Fragment key={p.id}>
                    <tr className={`hover:bg-muted/20 ${deleteConfirm === p.id ? 'bg-destructive/5' : ''}`}>
                      <td className="px-4 py-2">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-4 h-4 text-muted-foreground/40" /></div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">{p.title}</p>
                        <p className="text-xs text-muted-foreground">{p.brand ? p.brand + ' · ' : ''}{p.originCountry}</p>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{p.storageType}</td>
                      <td className="px-4 py-3 text-center text-xs font-medium">{variant ? `£${(variant.priceAmountMinor/100).toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-3 text-center text-xs">{variant ? variant.stockOnHand - variant.stockReserved : '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                          {p.isPublished ? 'Live' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {deleteConfirm === p.id ? (
                          <div className="flex items-center gap-1 justify-center">
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-7 px-2"
                              onClick={() => { deleteProduct.mutate(p.id); setDeleteConfirm(null); }}
                              disabled={deleteProduct.isPending}>Confirm</Button>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => { setEditId(isEditing ? null : p.id); setEditForm({ title: p.title, brand: p.brand ?? '', descriptionShort: p.descriptionShort, storageType: p.storageType, isPublished: p.isPublished, originCountry: p.originCountry, priceAmountMinor: variant?.priceAmountMinor, stockOnHand: variant?.stockOnHand }); }}
                              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => { setUploadTarget(p.id); imageInputRef.current?.click(); }}
                              className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="Upload image"><Upload className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDeleteConfirm(p.id)}
                              className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isEditing && (
                      <tr>
                        <td colSpan={7} className="px-4 pb-4 bg-muted/10 border-b border-border">
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Title</label>
                              <input value={editForm.title ?? ''} onChange={(e) => setEditForm({...editForm, title: e.target.value})} className="h-8 w-full rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Brand</label>
                              <input value={editForm.brand ?? ''} onChange={(e) => setEditForm({...editForm, brand: e.target.value})} className="h-8 w-full rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Price (pence)</label>
                              <input type="number" value={editForm.priceAmountMinor ?? ''} onChange={(e) => setEditForm({...editForm, priceAmountMinor: parseInt(e.target.value)})} className="h-8 w-full rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Stock</label>
                              <input type="number" value={editForm.stockOnHand ?? ''} onChange={(e) => setEditForm({...editForm, stockOnHand: parseInt(e.target.value)})} className="h-8 w-full rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold">Storage</label>
                              <select value={editForm.storageType ?? 'ambient'} onChange={(e) => setEditForm({...editForm, storageType: e.target.value})} className="h-8 w-full rounded border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary">
                                <option value="ambient">Ambient</option><option value="chilled">Chilled</option><option value="frozen">Frozen</option>
                              </select>
                            </div>
                            <div className="flex items-end gap-1.5 pb-0.5">
                              <input type="checkbox" id={`pub-${p.id}`} checked={editForm.isPublished ?? true} onChange={(e) => setEditForm({...editForm, isPublished: e.target.checked})} className="accent-primary" />
                              <label htmlFor={`pub-${p.id}`} className="text-xs font-semibold">Published</label>
                            </div>
                            <div className="col-span-full flex gap-2 mt-1">
                              <Button size="sm" onClick={() => handleUpdate(p.id)} disabled={updateProduct.isPending} className="gap-1 h-7">
                                <Save className="w-3 h-3" /> Save
                              </Button>
                              <Button size="sm" variant="outline" className="h-7" onClick={() => setEditId(null)}>Cancel</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}

// ─── Returns ─────────────────────────────────────────────────────────────────

function ReturnsTab() {
  const { data: returns, isLoading } = useAdminReturns();
  const resolveRma = useResolveRma();
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const items = returns ?? [];

  return (
    <>
      <h2 className="text-2xl font-bold">Returns & Refunds</h2>
      <div className="space-y-4">
        {isLoading ? (
          [1,2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <PackageCheck className="w-12 h-12 mx-auto mb-3 text-emerald-500" /><p>No pending returns</p>
          </div>
        ) : items.map((rma: any) => (
          <Card key={rma.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{rma.orderNumber}
                  <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded uppercase ${rma.status === 'PENDING_REVIEW' ? 'bg-amber-100 text-amber-800' : rma.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {rma.status?.replace(/_/g,' ')}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">{rma.customerEmail} · Reason: {rma.reasonCode?.replace(/_/g,' ')}</p>
                <p className="text-sm font-semibold mt-1">Refund: £{((rma.refundAmountMinor ?? 0)/100).toFixed(2)}</p>
              </div>
              {rma.status === 'PENDING_REVIEW' && (
                <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 flex-1"
                      disabled={resolveRma.isPending}
                      onClick={() => resolveRma.mutate({ rmaId: rma.id, action: 'approve' })}>
                      <ThumbsUp className="w-3 h-3 mr-1" /> Approve
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={rejectReasons[rma.id] ?? ''}
                      onChange={(e) => setRejectReasons(prev => ({...prev, [rma.id]: e.target.value}))}
                      placeholder="Rejection reason (optional)"
                      className="h-8 flex-1 rounded border border-border px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      disabled={resolveRma.isPending}
                      onClick={() => resolveRma.mutate({ rmaId: rma.id, action: 'reject', reason: rejectReasons[rma.id] || 'Rejected by admin' })}>
                      <ThumbsDown className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ─── Cargo Rates ─────────────────────────────────────────────────────────────

function CargoRatesTab() {
  const { data: rates, isLoading } = useAdminCargoRates();
  const updateRate = useUpdateCargoRate();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ pricePerKgMinor: string; transitDaysMin: string; transitDaysMax: string; notes: string }>({ pricePerKgMinor: '', transitDaysMin: '', transitDaysMax: '', notes: '' });

  function startEdit(rate: any) {
    setEditing(rate.mode);
    setForm({ pricePerKgMinor: String(rate.price_per_kg_minor), transitDaysMin: String(rate.transit_days_min), transitDaysMax: String(rate.transit_days_max), notes: rate.notes ?? '' });
  }

  async function handleSave(mode: string) {
    await updateRate.mutateAsync({ mode, body: {
      pricePerKgMinor: parseInt(form.pricePerKgMinor) || undefined,
      transitDaysMin: parseInt(form.transitDaysMin) || undefined,
      transitDaysMax: parseInt(form.transitDaysMax) || undefined,
      notes: form.notes || undefined,
    }});
    setEditing(null);
  }

  return (
    <>
      <h2 className="text-2xl font-bold">Cargo Rates</h2>
      <p className="text-sm text-muted-foreground">Manage sea and air freight pricing displayed on the cargo page and used for shipping quotes.</p>
      {isLoading ? (
        <div className="space-y-4">{[1,2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {(rates ?? []).map((rate: any) => {
            const isEditing = editing === rate.mode;
            const Icon = rate.mode === 'air' ? Plane : Ship;
            return (
              <Card key={rate.mode} className={isEditing ? 'border-primary/30' : ''}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${rate.mode === 'air' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                        <Icon className={`w-5 h-5 ${rate.mode === 'air' ? 'text-blue-600' : 'text-emerald-600'}`} />
                      </div>
                      <div>
                        <p className="font-bold capitalize">{rate.mode} Freight</p>
                        <p className="text-xs text-muted-foreground">Last updated: {new Date(rate.updated_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                    {!isEditing && (
                      <Button size="sm" variant="outline" onClick={() => startEdit(rate)} className="gap-1">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </Button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold">Price per kg (pence)</label>
                          <input type="number" value={form.pricePerKgMinor} onChange={(e) => setForm({...form, pricePerKgMinor: e.target.value})} className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          <p className="text-xs text-muted-foreground">= £{(parseInt(form.pricePerKgMinor||'0')/100).toFixed(2)}/kg</p>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold">Transit days</label>
                          <div className="flex items-center gap-1">
                            <input type="number" value={form.transitDaysMin} onChange={(e) => setForm({...form, transitDaysMin: e.target.value})} placeholder="Min" className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                            <span className="text-muted-foreground text-sm">–</span>
                            <input type="number" value={form.transitDaysMax} onChange={(e) => setForm({...form, transitDaysMax: e.target.value})} placeholder="Max" className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold">Notes</label>
                        <input value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} placeholder="e.g. Ideal for heavy goods" className="h-9 w-full rounded-lg border border-border px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(rate.mode)} disabled={updateRate.isPending} className="gap-1">
                          <Save className="w-3.5 h-3.5" /> {updateRate.isPending ? 'Saving...' : 'Save Rate'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Price per kg</p>
                        <p className="font-bold text-lg">£{(rate.price_per_kg_minor/100).toFixed(2)}</p>
                      </div>
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Transit Time</p>
                        <p className="font-bold">{rate.transit_days_min}–{rate.transit_days_max} days</p>
                      </div>
                      {rate.notes && <div className="col-span-2 text-xs text-muted-foreground italic">{rate.notes}</div>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

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
      <div className="space-y-3">
        {isLoading ? (
          [1,2,3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" /><p>No contact messages yet</p>
          </div>
        ) : items.map((msg: any) => (
          <Card key={msg.id} className={!msg.isRead ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {!msg.isRead && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />}
                    <p className="font-bold text-sm">{msg.name}</p>
                    <a href={`mailto:${msg.email}`} className="text-xs text-primary hover:underline">{msg.email}</a>
                    {msg.phone && <span className="text-xs text-muted-foreground">{msg.phone}</span>}
                  </div>
                  <p className="font-semibold text-sm mb-1">{msg.subject}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{msg.message}</p>
                  <p className="text-xs text-muted-foreground mt-2">{new Date(msg.createdAt).toLocaleString('en-GB')}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {!msg.isRead && (
                    <Button variant="outline" size="sm" className="text-xs h-7" disabled={markRead.isPending} onClick={() => markRead.mutate(msg.id)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Read
                    </Button>
                  )}
                  <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}>
                    <Button variant="outline" size="sm" className="text-xs h-7 w-full">
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

// ─── Reviews ─────────────────────────────────────────────────────────────────

function ReviewsTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data: reviews, isLoading } = useAdminReviews(statusFilter || undefined, 100);
  const moderate = useModerateReview();
  const deleteReview = useDeleteReview();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const items = reviews ?? [];

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {['pending','approved','rejected'].map((s) => (
          <Card key={s}>
            <CardContent className="p-3 text-center">
              <p className={`text-xl font-bold ${s==='pending'?'text-amber-600':s==='approved'?'text-emerald-600':'text-red-600'}`}>
                {items.filter((r: any) => r.status === s).length}
              </p>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{s}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-2.5">
        {isLoading ? (
          [1,2,3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground"><Star className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No reviews</p></div>
        ) : items.map((review: any) => (
          <Card key={review.id} className={review.status === 'pending' ? 'border-amber-300/40 bg-amber-50/20' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[review.status]}`}>{review.status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${review.source==='google'?'bg-blue-100 text-blue-700':'bg-gray-100 text-gray-600'}`}>{review.source}</span>
                    <div className="flex gap-0.5">{[1,2,3,4,5].map((s)=><Star key={s} className={`w-3 h-3 ${s<=review.rating?'fill-amber-400 text-amber-400':'text-muted-foreground/20'}`}/>)}</div>
                  </div>
                  <p className="font-bold text-sm">{review.author_name}</p>
                  <p className="text-sm text-foreground mt-1 leading-relaxed line-clamp-2">&ldquo;{review.comment}&rdquo;</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(review.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {review.status !== 'approved' && (
                    <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 text-xs h-7 gap-1"
                      disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, action: 'approve' })}>
                      <ThumbsUp className="w-3 h-3" /> Approve
                    </Button>
                  )}
                  {review.status !== 'rejected' && (
                    <Button variant="outline" size="sm" className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs h-7 gap-1"
                      disabled={moderate.isPending} onClick={() => moderate.mutate({ id: review.id, action: 'reject' })}>
                      <ThumbsDown className="w-3 h-3" /> Reject
                    </Button>
                  )}
                  {deleteConfirm === review.id ? (
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 text-xs h-7 px-2"
                        onClick={() => { deleteReview.mutate(review.id); setDeleteConfirm(null); }}>Yes</Button>
                      <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => setDeleteConfirm(null)}>No</Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-7 gap-1"
                      onClick={() => setDeleteConfirm(review.id)}>
                      <Trash2 className="w-3 h-3" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
