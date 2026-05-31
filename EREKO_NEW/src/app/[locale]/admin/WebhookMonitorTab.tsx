'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { RefreshCcw, ChevronDown, ChevronUp, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useStripeWebhookLogs, useRetryStripeWebhook, useResolveStripeWebhook, StripeWebhookLog } from '@/services/admin';

const STATUS_BADGE: Record<string, string> = {
  processed: 'bg-emerald-100 text-emerald-800',
  received:  'bg-amber-100 text-amber-800',
  failed:    'bg-red-100 text-red-800',
  ignored:   'bg-gray-100 text-gray-600',
};

export function WebhookMonitorTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payloads, setPayloads] = useState<Record<string, any>>({});

  const { data, isLoading, refetch, isFetching } = useStripeWebhookLogs({
    page,
    pageSize: 25,
    status: statusFilter || undefined,
    eventType: typeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  });

  const retryMutation = useRetryStripeWebhook();
  const resolveMutation = useResolveStripeWebhook();

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  const toggleExpand = async (log: StripeWebhookLog) => {
    if (expandedId === log.id) { setExpandedId(null); return; }
    setExpandedId(log.id);
    if (!payloads[log.id]) {
      try {
        const res = await fetch(`/api/v1/admin/webhooks/stripe/${log.id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        });
        const d = await res.json();
        setPayloads(p => ({ ...p, [log.id]: d.payload ?? d }));
      } catch { setPayloads(p => ({ ...p, [log.id]: 'Error loading payload' })); }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold flex-1">Stripe Webhook Monitor</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`w-4 h-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-muted/20 rounded-xl p-3">
        <input className="border rounded-lg px-3 py-1.5 text-sm min-w-[180px]" placeholder="Event type (e.g. payment_intent.succeeded)"
          value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} />
        <select className="border rounded-lg px-3 py-1.5 text-sm" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="received">Received</option>
          <option value="processed">Processed</option>
          <option value="failed">Failed</option>
          <option value="ignored">Ignored</option>
        </select>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>From:</span>
          <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
          <span>To:</span>
          <input type="date" className="border rounded-lg px-2 py-1.5 text-sm" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground py-8 text-center">Loading webhook events…</div>
      ) : !data?.events?.length ? (
        <div className="text-muted-foreground py-8 text-center">No webhook events found.</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Event ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Received</th>
                  <th className="text-left px-4 py-3 font-semibold">Processed</th>
                  <th className="text-left px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.events.map((log: StripeWebhookLog) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="hover:bg-muted/10 cursor-pointer"
                      onClick={() => toggleExpand(log)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.stripeEventId.slice(0, 20)}…</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.eventType}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[log.status] ?? 'bg-gray-100'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(log.receivedAt).toLocaleString('en-GB')}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{log.processedAt ? new Date(log.processedAt).toLocaleString('en-GB') : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          {log.status === 'failed' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs"
                                onClick={() => retryMutation.mutate(log.id)}
                                disabled={retryMutation.isPending}>
                                <RotateCcw className="w-3 h-3 mr-1" /> Retry
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700"
                                onClick={() => resolveMutation.mutate(log.id)}
                                disabled={resolveMutation.isPending}>
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Resolve
                              </Button>
                            </>
                          )}
                          {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                        </div>
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr>
                        <td colSpan={6} className="bg-gray-950 text-green-400 px-4 py-3">
                          {log.processingError && (
                            <div className="text-red-400 text-xs mb-2 font-mono">Error: {log.processingError}</div>
                          )}
                          <pre className="text-xs overflow-x-auto max-h-64 whitespace-pre-wrap">
                            {payloads[log.id] ? JSON.stringify(payloads[log.id], null, 2) : 'Loading payload…'}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{data?.total ?? 0} total events</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      )}
    </div>
  );
}
