import React from 'react';
import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, Package, MapPin, CreditCard, Heart, LogOut, Star, TrendingUp, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function AccountPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations('common');

  return (
    <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 flex-shrink-0">
          <Card className="border-0 shadow-sm bg-muted/20">
              <CardContent className="p-4 space-y-1">
                  <div className="flex items-center gap-3 p-4 mb-4 bg-background rounded-lg border border-border">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">JD</div>
                      <div>
                          <p className="font-bold">John Doe</p>
                          <p className="text-xs text-muted-foreground">Premium Member</p>
                      </div>
                  </div>

                  <Link href={`/${locale}/account`} className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground font-medium">
                      <User className="w-5 h-5" /> Dashboard
                  </Link>
                  <Link href={`/${locale}/account/orders`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors">
                      <Package className="w-5 h-5 text-muted-foreground" /> Orders & Returns
                  </Link>
                  <Link href={`/${locale}/account/addresses`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors">
                      <MapPin className="w-5 h-5 text-muted-foreground" /> Address Book
                  </Link>
                  <Link href={`/${locale}/account/payments`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors">
                      <CreditCard className="w-5 h-5 text-muted-foreground" /> Saved Cards
                  </Link>
                  <Link href={`/${locale}/account/wishlist`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-foreground transition-colors">
                      <Heart className="w-5 h-5 text-muted-foreground" /> Wishlist
                  </Link>
                  
                  <div className="pt-4 mt-4 border-t border-border">
                      <button className="flex items-center gap-3 p-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors w-full text-left">
                          <LogOut className="w-5 h-5" /> Sign Out
                      </button>
                  </div>
              </CardContent>
          </Card>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 space-y-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, John!</h1>

          {/* Loyalty Banner */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
              <div className="flex-1 space-y-2 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                      <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                      <h2 className="text-xl font-bold">Ereko Rewards</h2>
                  </div>
                  <p className="text-muted-foreground">You are <span className="font-bold text-foreground">350 points</span> away from VIP Status!</p>
                  
                  <div className="w-full bg-background rounded-full h-3 mt-4 border border-border">
                    <div className="bg-primary h-3 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Premium (650 pts)</span>
                      <span>VIP (1,000 pts)</span>
                  </div>
              </div>
              <div className="flex flex-col items-center justify-center bg-background p-4 rounded-xl border border-border min-w-[120px]">
                  <span className="text-3xl font-bold text-primary">650</span>
                  <span className="text-xs font-medium uppercase tracking-wider">Points</span>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usual Reorder Helper */}
              <Card className="border-0 shadow-sm bg-muted/20">
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" /> Buy It Again</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {[1, 2, 3].map((i) => (
                          <div key={i} className="flex items-center gap-4 bg-background p-3 rounded-lg border border-border">
                              <div className="w-12 h-12 bg-muted rounded overflow-hidden">
                                  <img src={`/images/img0${i}.jpg`} alt="Product" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 text-sm">
                                  <p className="font-bold line-clamp-1">African Market Product {i}</p>
                                  <p className="text-muted-foreground">Last bought: Oct {i + 10}, 2023</p>
                              </div>
                              <Button size="sm" variant="secondary" className="rounded-full"><RefreshCw className="w-4 h-4 mr-1" /> Add</Button>
                          </div>
                      ))}
                      <Button variant="outline" className="w-full mt-2">View Full Order History</Button>
                  </CardContent>
              </Card>

              {/* Quick Stats / Streak */}
              <div className="space-y-6">
                  <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/20">
                      <CardContent className="p-6 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                              <TrendingUp className="w-6 h-6" />
                          </div>
                          <div>
                              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-500">Shopping Streak</p>
                              <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-400">4 Months</p>
                          </div>
                      </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm bg-muted/20">
                      <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Recent Orders</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                          <Link href={`/${locale}/account/orders/ERK-9876`} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors group">
                              <div>
                                  <p className="font-bold text-sm">ERK-9876</p>
                                  <p className="text-xs text-muted-foreground">2 days ago • 5 items</p>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded uppercase">In Transit</span>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              </div>
                          </Link>
                           <Link href={`/${locale}/account/orders/ERK-9875`} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border hover:border-primary transition-colors group">
                              <div>
                                  <p className="font-bold text-sm">ERK-9875</p>
                                  <p className="text-xs text-muted-foreground">Sep 15, 2023 • 12 items</p>
                              </div>
                              <div className="flex items-center gap-3">
                                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded uppercase">Delivered</span>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              </div>
                          </Link>
                      </CardContent>
                  </Card>
              </div>
          </div>
      </div>
    </main>
  );
}
