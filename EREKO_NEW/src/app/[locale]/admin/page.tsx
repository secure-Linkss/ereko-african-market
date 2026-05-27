import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, Settings, Bell, 
  Search, ArrowUpRight, ArrowDownRight, PackageCheck, AlertCircle, RefreshCcw
} from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return (
    <div className="flex min-h-screen bg-muted/20">
      
      {/* Admin Sidebar */}
      <aside className="w-64 bg-background border-r border-border flex flex-col hidden lg:flex">
          <div className="p-6 border-b border-border">
              <img src="/logo.jpeg" alt="Ereko Logo" className="h-10 mb-1 rounded-full border-2 border-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1">Admin Console</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
              <Link href={`/${locale}/admin`} className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium">
                  <LayoutDashboard className="w-5 h-5" /> Dashboard
              </Link>
              <Link href={`/${locale}/admin/orders`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors">
                  <ShoppingBag className="w-5 h-5" /> Orders <span className="ml-auto bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">12</span>
              </Link>
              <Link href={`/${locale}/admin/inventory`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors">
                  <Package className="w-5 h-5" /> Inventory <span className="ml-auto bg-destructive/10 text-destructive text-xs font-bold px-2 py-0.5 rounded-full">3</span>
              </Link>
              <Link href={`/${locale}/admin/returns`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors">
                  <RefreshCcw className="w-5 h-5" /> Returns
              </Link>
              <Link href={`/${locale}/admin/customers`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors">
                  <Users className="w-5 h-5" /> Customers
              </Link>
          </nav>
          <div className="p-4 border-t border-border">
              <Link href={`/${locale}/admin/settings`} className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg transition-colors">
                  <Settings className="w-5 h-5" /> Settings
              </Link>
          </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
          
          {/* Topbar */}
          <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0">
              <div className="flex items-center gap-4 flex-1">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input type="text" placeholder="Search orders (e.g. ERK-1234), products, or customers..." className="bg-transparent border-none focus:outline-none w-full max-w-md text-sm" />
              </div>
              <div className="flex items-center gap-4">
                  <button className="relative p-2 text-muted-foreground hover:text-foreground">
                      <Bell className="w-5 h-5" />
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">A</div>
              </div>
          </header>

          {/* Dashboard Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Overview</h2>
                  <select className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      <option>Today</option>
                      <option>Last 7 Days</option>
                      <option>This Month</option>
                  </select>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                      <CardContent className="p-6">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Total Revenue</p>
                          <div className="flex items-end justify-between">
                              <h3 className="text-3xl font-bold">£4,250.00</h3>
                              <div className="flex items-center text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                  <ArrowUpRight className="w-4 h-4 mr-1" /> 12.5%
                              </div>
                          </div>
                      </CardContent>
                  </Card>
                   <Card>
                      <CardContent className="p-6">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Active Orders</p>
                          <div className="flex items-end justify-between">
                              <h3 className="text-3xl font-bold">45</h3>
                               <div className="flex items-center text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                  <ArrowUpRight className="w-4 h-4 mr-1" /> 5.2%
                              </div>
                          </div>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardContent className="p-6">
                          <p className="text-sm font-medium text-muted-foreground mb-2">Pending Returns</p>
                          <div className="flex items-end justify-between">
                              <h3 className="text-3xl font-bold">8</h3>
                               <div className="flex items-center text-sm text-destructive bg-destructive/10 px-2 py-1 rounded">
                                  <ArrowUpRight className="w-4 h-4 mr-1" /> 2.1%
                              </div>
                          </div>
                      </CardContent>
                  </Card>
                  <Card className="border-destructive/50 bg-destructive/5">
                      <CardContent className="p-6">
                          <p className="text-sm font-medium text-destructive flex items-center gap-2 mb-2">
                              <AlertCircle className="w-4 h-4" /> Low Stock Alerts
                          </p>
                          <div className="flex items-end justify-between">
                              <h3 className="text-3xl font-bold text-destructive">12</h3>
                              <Link href={`/${locale}/admin/inventory`} className="text-sm text-destructive hover:underline font-medium">Review</Link>
                          </div>
                      </CardContent>
                  </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Orders Grid */}
                  <Card className="lg:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle>Recent Orders</CardTitle>
                          <Button variant="outline" size="sm">View All</Button>
                      </CardHeader>
                      <CardContent className="p-0">
                          <table className="w-full text-sm text-left">
                              <thead className="bg-muted/50 text-muted-foreground">
                                  <tr>
                                      <th className="px-6 py-3 font-medium">Order ID</th>
                                      <th className="px-6 py-3 font-medium">Customer</th>
                                      <th className="px-6 py-3 font-medium">Status</th>
                                      <th className="px-6 py-3 font-medium text-right">Total</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                  {[1, 2, 3, 4, 5].map((i) => (
                                      <tr key={i} className="hover:bg-muted/20 transition-colors">
                                          <td className="px-6 py-4 font-medium"><Link href="#" className="hover:text-primary">ERK-80{i}2</Link></td>
                                          <td className="px-6 py-4">Customer Name {i}</td>
                                          <td className="px-6 py-4">
                                              {i === 1 ? <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-bold uppercase">Pending Pick</span> : 
                                               i === 2 ? <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold uppercase">Processing</span> : 
                                               <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs font-bold uppercase">Shipped</span>}
                                          </td>
                                          <td className="px-6 py-4 text-right font-medium">£{(i * 12.5).toFixed(2)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </CardContent>
                  </Card>

                  {/* Operational Alerts */}
                  <div className="space-y-6">
                      <Card>
                          <CardHeader>
                              <CardTitle className="text-lg">Action Required</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                              <div className="flex gap-4 items-start p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-900/50">
                                  <PackageCheck className="w-5 h-5 text-amber-600 mt-0.5" />
                                  <div>
                                      <p className="text-sm font-bold text-amber-900 dark:text-amber-500">3 Orders Overdue for Picking</p>
                                      <p className="text-xs text-amber-700 dark:text-amber-600/80 mt-1">Next-day delivery orders ERK-8001, ERK-8002 need immediate attention.</p>
                                  </div>
                              </div>
                               <div className="flex gap-4 items-start p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                                  <div>
                                      <p className="text-sm font-bold text-destructive">Olu Olu Palm Wine Stock Depleted</p>
                                      <p className="text-xs text-destructive/80 mt-1">SKU: OLU-PW-750 has reached 0. Supplier PO needs to be raised.</p>
                                  </div>
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              </div>
          </div>
      </main>
    </div>
  );
}
