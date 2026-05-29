'use client';

import React, { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Search, PackageSearch, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import OrderTrackingTimeline from '@/components/OrderTrackingTimeline';
import { motion } from 'framer-motion';

function usePublicTracking(orderNumber: string, email: string) {
  return useQuery({
    queryKey: ['public-tracking', orderNumber, email],
    queryFn: async () => {
      const res = await apiClient.get('/api/v1/orders/track', {
        params: { orderNumber: orderNumber.trim().toUpperCase(), email: email.trim().toLowerCase() },
      });
      return res.data;
    },
    enabled: !!orderNumber && !!email,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });
}

export default function TrackOrderPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';
  const searchParams = useSearchParams();

  const [orderNumber, setOrderNumber] = useState(searchParams?.get('order') ?? '');
  const [email, setEmail] = useState(searchParams?.get('email') ?? '');
  const [submitted, setSubmitted] = useState(!!(searchParams?.get('order') && searchParams?.get('email')));
  const [error, setError] = useState('');
  const router = useRouter();

  const { data, isLoading, isError } = usePublicTracking(
    submitted ? orderNumber : '',
    submitted ? email : '',
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!orderNumber.trim()) return setError('Enter your order number.');
    if (!email.trim()) return setError('Enter your email address.');
    setSubmitted(true);
    router.replace(`/${locale}/track?order=${encodeURIComponent(orderNumber.trim())}&email=${encodeURIComponent(email.trim())}`);
  }

  function handleReset() {
    setSubmitted(false);
    setOrderNumber('');
    setEmail('');
    router.replace(`/${locale}/track`);
  }

  return (
    <main className="flex-1 bg-background">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto">
            <PackageSearch className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Track Your Order</h1>
          <p className="text-primary-foreground/80 text-lg">
            Enter your order number and email to see live status and tracking information.
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        {/* Lookup form */}
        {!submitted && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Order Number</label>
                    <input
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. ERK-2025-00123"
                      className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">Found in your order confirmation email</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="The email used when ordering"
                      className="w-full h-12 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      autoComplete="email"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg">{error}</p>
                  )}

                  <Button type="submit" size="lg" className="w-full gap-2">
                    <Search className="w-4 h-4" /> Track Order
                  </Button>
                </form>

                <div className="text-center pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-3">Have an account?</p>
                  <Link href={`/${locale}/account`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      View all orders in my account <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Loading */}
        {submitted && isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-12 rounded-2xl" />
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        )}

        {/* Error */}
        {submitted && isError && !isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-destructive/30">
              <CardContent className="p-8 text-center space-y-4">
                <PackageSearch className="w-14 h-14 mx-auto text-muted-foreground/30" />
                <h3 className="font-bold text-lg">Order not found</h3>
                <p className="text-muted-foreground text-sm">
                  We couldn&apos;t find an order matching that number and email address.<br />
                  Please check your confirmation email and try again.
                </p>
                <Button variant="outline" onClick={handleReset}>Try again</Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {submitted && data && !isLoading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6 md:p-8">
                <OrderTrackingTimeline data={data} />
              </CardContent>
            </Card>
            <div className="text-center mt-6">
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-muted-foreground">
                Track a different order
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
