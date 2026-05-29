'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Clock, Truck, Package, PackageCheck,
  MapPin, CreditCard, Store, Receipt, Circle,
} from 'lucide-react';

interface TrackingStep {
  key: string;
  label: string;
  icon: string;
  desc: string;
  state: 'completed' | 'active' | 'pending';
}

interface TrackingData {
  orderNumber: string;
  status: string;
  deliveryMethod: string;
  isClickAndCollect: boolean;
  trackingNumber: string | null;
  carrierName: string | null;
  placedAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  totalMinor: number;
  items: { title: string; variantName: string; quantity: number }[];
  steps: TrackingStep[];
  timeline: { eventType: string; timestamp: string; note: string | null }[];
  collectionAddress: string | null;
  collectionHours: string | null;
}

const ICON_MAP: Record<string, React.ElementType> = {
  receipt: Receipt,
  'credit-card': CreditCard,
  box: Package,
  package: Package,
  'package-check': PackageCheck,
  truck: Truck,
  'map-pin': MapPin,
  'check-circle': CheckCircle2,
  store: Store,
};

function StepIcon({ icon, state }: { icon: string; state: TrackingStep['state'] }) {
  const Icon = ICON_MAP[icon] ?? Circle;
  if (state === 'completed') return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
  if (state === 'active') return <Icon className="w-5 h-5 text-primary animate-pulse" />;
  return <Icon className="w-5 h-5 text-muted-foreground/40" />;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: 'Awaiting Payment', cls: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Confirmed', cls: 'bg-blue-100 text-blue-800' },
  ALLOCATED: { label: 'Processing', cls: 'bg-blue-100 text-blue-800' },
  PICKING: { label: 'Picking Items', cls: 'bg-indigo-100 text-indigo-800' },
  PACKED: { label: 'Ready', cls: 'bg-emerald-100 text-emerald-800' },
  SHIPPED: { label: 'Shipped', cls: 'bg-violet-100 text-violet-800' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', cls: 'bg-amber-100 text-amber-800' },
  DELIVERED: { label: 'Delivered', cls: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-800' },
  ON_HOLD: { label: 'On Hold', cls: 'bg-orange-100 text-orange-800' },
};

export default function OrderTrackingTimeline({ data }: { data: TrackingData }) {
  const badge = STATUS_BADGE[data.status] ?? { label: data.status, cls: 'bg-gray-100 text-gray-700' };
  const activeStep = data.steps.find((s) => s.state === 'active');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-1">Order</p>
          <h2 className="text-2xl font-black text-foreground">{data.orderNumber}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Placed {new Date(data.placedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-sm font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="text-lg font-bold">£{(data.totalMinor / 100).toFixed(2)}</span>
          <span className="text-xs text-muted-foreground capitalize">
            {data.isClickAndCollect ? '🏪 Click & Collect' : `🚚 ${data.deliveryMethod.replace(/_/g, ' ')}`}
          </span>
        </div>
      </div>

      {/* Active step callout */}
      {activeStep && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-2xl p-5 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-foreground">{activeStep.label}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{activeStep.desc}</p>
          </div>
        </motion.div>
      )}

      {/* Collection info */}
      {data.isClickAndCollect && data.status === 'PACKED' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-emerald-800">Your order is ready for collection!</p>
          </div>
          <p className="text-sm text-emerald-700">📍 {data.collectionAddress}</p>
          <p className="text-sm text-emerald-700">🕐 {data.collectionHours}</p>
          <p className="text-xs text-emerald-600 mt-2">Please bring your order confirmation email or order number.</p>
        </motion.div>
      )}

      {/* Carrier info */}
      {!data.isClickAndCollect && data.trackingNumber && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
          <Truck className="w-5 h-5 text-violet-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-violet-800">{data.carrierName} Tracking</p>
            <p className="text-xs font-mono text-violet-700 mt-0.5">{data.trackingNumber}</p>
          </div>
        </div>
      )}

      {/* Progress steps */}
      <div className="space-y-0">
        {data.steps.map((step, idx) => {
          const isLast = idx === data.steps.length - 1;
          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="flex gap-4"
            >
              {/* Line + icon */}
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  step.state === 'completed' ? 'bg-emerald-50 border-emerald-400' :
                  step.state === 'active' ? 'bg-primary/10 border-primary shadow-md shadow-primary/20' :
                  'bg-muted/50 border-muted-foreground/20'
                }`}>
                  <StepIcon icon={step.icon} state={step.state} />
                </div>
                {!isLast && (
                  <div className={`w-0.5 h-8 mt-1 ${step.state === 'completed' ? 'bg-emerald-300' : 'bg-muted-foreground/15'}`} />
                )}
              </div>

              {/* Content */}
              <div className="pb-8 flex-1 pt-1.5">
                <p className={`font-semibold text-sm ${
                  step.state === 'active' ? 'text-primary' :
                  step.state === 'completed' ? 'text-foreground' :
                  'text-muted-foreground/50'
                }`}>
                  {step.label}
                </p>
                {step.state !== 'pending' && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Items */}
      {data.items.length > 0 && (
        <div className="border-t border-border pt-6 space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Items in this order</h3>
          <ul className="space-y-2">
            {data.items.map((item, i) => (
              <li key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.title} <span className="text-muted-foreground text-xs">({item.variantName})</span></span>
                <span className="text-muted-foreground">×{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Event timeline */}
      {data.timeline.length > 0 && (
        <details className="border-t border-border pt-6">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground select-none">
            View full history ({data.timeline.length} events)
          </summary>
          <ul className="mt-4 space-y-2">
            {[...data.timeline].reverse().map((ev, i) => (
              <li key={i} className="flex items-start gap-3 text-xs">
                <span className="text-muted-foreground/60 font-mono w-36 flex-shrink-0">
                  {new Date(ev.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-foreground">{ev.eventType.replace(/_/g, ' ')}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
