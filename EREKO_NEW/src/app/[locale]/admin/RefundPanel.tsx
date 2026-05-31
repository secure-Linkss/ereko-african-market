'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useRefundSummary, useProcessRefund, useRefundHistory, ProcessRefundRequest, RefundLineItem } from '@/services/admin';
import { AlertCircle, CheckCircle2, Banknote } from 'lucide-react';

const REFUND_REASONS = [
  { value: 'Damaged item', label: 'Damaged item' },
  { value: 'Wrong item sent', label: 'Wrong item sent' },
  { value: 'Customer request', label: 'Customer request' },
  { value: 'Quality issue', label: 'Quality issue' },
  { value: 'Other', label: 'Other' },
];

interface Props {
  orderId: string;
  customerName?: string;
}

export function RefundPanel({ orderId, customerName = 'Customer' }: Props) {
  const { data: summary, isLoading } = useRefundSummary(orderId);
  const { data: history } = useRefundHistory(orderId);
  const processRefund = useProcessRefund();

  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [refundDelivery, setRefundDelivery] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (isLoading) return <div className="text-muted-foreground py-4 text-sm">Loading refund details…</div>;
  if (!summary) return null;

  const { order, items, maxRefundableMinor } = summary;

  const itemsTotal = Object.entries(selectedItems).reduce((sum, [itemId, qty]) => {
    const item = items.find((i: any) => i.id === itemId);
    return sum + (item ? item.priceAmountMinor * qty : 0);
  }, 0);

  const deliveryTotal = refundDelivery ? (order.shippingMinor ?? 0) : 0;
  const customAmountMinor = customAmount ? Math.round(parseFloat(customAmount) * 100) : 0;
  const totalRefund = customAmountMinor > 0 ? customAmountMinor : itemsTotal + deliveryTotal;

  const isOverRefund = totalRefund > maxRefundableMinor;

  const handleQuantityChange = (itemId: string, qty: number, maxQty: number) => {
    if (qty <= 0) { const next = { ...selectedItems }; delete next[itemId]; setSelectedItems(next); }
    else setSelectedItems(prev => ({ ...prev, [itemId]: Math.min(qty, maxQty) }));
  };

  const handleConfirm = async () => {
    setError('');
    try {
      const body: ProcessRefundRequest = { reason, notes: notes || undefined };
      if (customAmountMinor > 0) {
        body.customAmountMinor = customAmountMinor;
      } else {
        const lineItems: RefundLineItem[] = Object.entries(selectedItems).map(([orderItemId, quantity]) => ({ orderItemId, quantity }));
        if (lineItems.length > 0) body.items = lineItems;
        if (refundDelivery) body.refundDelivery = true;
      }
      const result = await processRefund.mutateAsync({ orderId, body });
      setSuccess(`Refund of ${result.amountFormatted} processed successfully. Status: ${result.newOrderStatus}`);
      setShowConfirm(false);
      setSelectedItems({});
      setRefundDelivery(false);
      setCustomAmount('');
      setReason('');
      setNotes('');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Refund failed. Please try again.');
      setShowConfirm(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Process Refund</h3>
        <span className="text-xs text-muted-foreground">Max refundable: <strong>£{(maxRefundableMinor / 100).toFixed(2)}</strong></span>
      </div>

      {success && (
        <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {success}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Line items */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Select Items to Refund</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b last:border-0">
              <input
                type="checkbox"
                checked={item.id in selectedItems}
                onChange={e => {
                  if (e.target.checked) handleQuantityChange(item.id, 1, item.quantity);
                  else handleQuantityChange(item.id, 0, item.quantity);
                }}
                className="rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{item.title}{item.variantName ? ` — ${item.variantName}` : ''}</div>
                <div className="text-xs text-muted-foreground">£{(item.priceAmountMinor / 100).toFixed(2)} × {item.quantity}</div>
              </div>
              {item.id in selectedItems && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Qty:</label>
                  <input
                    type="number"
                    min={1}
                    max={item.quantity}
                    value={selectedItems[item.id]}
                    onChange={e => handleQuantityChange(item.id, parseInt(e.target.value, 10), item.quantity)}
                    className="w-16 border rounded-lg px-2 py-1 text-sm"
                  />
                </div>
              )}
              <div className="text-sm font-semibold text-primary w-16 text-right">
                {item.id in selectedItems ? `£${((item.priceAmountMinor * selectedItems[item.id]) / 100).toFixed(2)}` : '—'}
              </div>
            </div>
          ))}

          {order.shippingMinor > 0 && (
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" checked={refundDelivery} onChange={e => setRefundDelivery(e.target.checked)} className="rounded" />
              <div className="flex-1 text-sm">Refund Delivery Charge</div>
              <div className="text-sm font-semibold text-primary">£{(order.shippingMinor / 100).toFixed(2)}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom amount */}
      <div>
        <label className="block text-sm font-medium mb-1">Custom Amount (£) — overrides item selection</label>
        <div className="relative w-40">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
          <input
            type="number"
            min={0}
            step={0.01}
            className="border rounded-lg pl-7 pr-3 py-2 text-sm w-full"
            value={customAmount}
            onChange={e => setCustomAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Reason & Notes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Reason <span className="text-red-500">*</span></label>
          <select className="w-full border rounded-lg px-3 py-2 text-sm" value={reason} onChange={e => setReason(e.target.value)}>
            <option value="">Select reason…</option>
            {REFUND_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes (internal)</label>
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Optional internal note…"
          />
        </div>
      </div>

      {/* Running total */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${isOverRefund ? 'bg-red-50 border border-red-200' : 'bg-primary/5 border border-primary/20'}`}>
        <span className="text-sm font-semibold">Total refund amount:</span>
        <span className={`text-lg font-bold ${isOverRefund ? 'text-red-600' : 'text-primary'}`}>
          £{(totalRefund / 100).toFixed(2)}
        </span>
      </div>

      {isOverRefund && (
        <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Exceeds max refundable amount of £{(maxRefundableMinor / 100).toFixed(2)}</p>
      )}

      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!reason || totalRefund <= 0 || isOverRefund || processRefund.isPending}
        className="w-full sm:w-auto"
      >
        Process Refund
      </Button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-lg mb-2">Confirm Refund</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You are about to refund <strong className="text-primary">£{(totalRefund / 100).toFixed(2)}</strong> to <strong>{customerName}</strong>.
              <br />This action <strong>cannot be undone</strong>.
            </p>
            <p className="text-xs text-muted-foreground mb-4">Reason: {reason}</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={processRefund.isPending}>
                {processRefund.isPending ? 'Processing…' : 'Confirm Refund'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Refund history */}
      {history && history.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Refund History</h4>
          <div className="space-y-2">
            {history.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-sm bg-muted/20 rounded-lg px-3 py-2">
                <div>
                  <span className="font-medium">£{(r.amountMinor / 100).toFixed(2)}</span>
                  <span className="text-muted-foreground ml-2">— {r.reason}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
