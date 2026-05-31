'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Truck, Plus, Trash2, Save, RefreshCcw } from 'lucide-react';
import { useDeliverySettings, useUpdateDeliverySettings, DeliveryTier, UpdateDeliverySettingsRequest } from '@/services/admin';

export function DeliverySettingsTab() {
  const { data, isLoading, refetch } = useDeliverySettings();
  const updateMutation = useUpdateDeliverySettings();

  const [storePostcode, setStorePostcode] = useState('IG11 7LS');
  const [maxRadius, setMaxRadius] = useState(15);
  const [pricingMode, setPricingMode] = useState<'tiers' | 'per_km'>('tiers');
  const [perKmPrice, setPerKmPrice] = useState(30); // pence per km
  const [baseFee, setBaseFee] = useState(99); // pence base fee
  const [nextDayPremium, setNextDayPremium] = useState(200); // pence
  const [freeThreshold, setFreeThreshold] = useState(5500); // pence
  const [tiers, setTiers] = useState<DeliveryTier[]>([
    { fromKm: 0, toKm: 1, priceMinor: 99, label: 'Local' },
    { fromKm: 1, toKm: 3, priceMinor: 199, label: 'Nearby' },
    { fromKm: 3, toKm: 6, priceMinor: 299, label: 'Standard' },
    { fromKm: 6, toKm: 10, priceMinor: 399, label: 'Extended' },
  ]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.settings) {
      setStorePostcode(data.settings.storePostcode ?? 'IG11 7LS');
      setMaxRadius(data.settings.maxRadiusKm ?? 15);
      setPricingMode(data.settings.pricingMode ?? 'tiers');
      setPerKmPrice(data.settings.perKmPriceMinor ?? 30);
      setBaseFee(data.settings.baseFeePriceMinor ?? 99);
      setNextDayPremium((data.settings as any).nextDayPremiumMinor ?? 200);
      setFreeThreshold((data.settings as any).freeDeliveryThresholdMinor ?? 5500);
    }
    if (data?.tiers?.length) {
      setTiers(data.tiers.map((t: any) => ({
        id: t.id,
        label: t.label ?? '',
        fromKm: t.fromKm,
        toKm: t.toKm,
        priceMinor: t.priceMinor,
        position: t.position,
      })));
    }
  }, [data]);

  const addTier = () => {
    const last = tiers[tiers.length - 1];
    setTiers([...tiers, { fromKm: last?.toKm ?? 0, toKm: (last?.toKm ?? 0) + 2, priceMinor: 399, label: '' }]);
  };

  const removeTier = (idx: number) => setTiers(tiers.filter((_, i) => i !== idx));

  const updateTier = (idx: number, field: keyof DeliveryTier, value: any) => {
    setTiers(tiers.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleSave = async () => {
    setError('');
    try {
      const body: UpdateDeliverySettingsRequest & { nextDayPremiumMinor?: number; freeDeliveryThresholdMinor?: number } = {
        storePostcode,
        maxRadiusKm: maxRadius,
        pricingMode,
        nextDayPremiumMinor: nextDayPremium,
        freeDeliveryThresholdMinor: freeThreshold,
      };
      if (pricingMode === 'per_km') {
        body.perKmPriceMinor = perKmPrice;
        body.baseFeePriceMinor = baseFee;
      } else {
        body.tiers = tiers.map((t, idx) => ({ ...t, position: idx }));
      }
      await updateMutation.mutateAsync(body);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save settings');
    }
  };

  if (isLoading) return <div className="text-muted-foreground py-8 text-center">Loading delivery settings…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Delivery Settings</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCcw className="w-4 h-4 mr-1" /> Refresh</Button>
      </div>

      {/* Store & Radius */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Store & Delivery Zone</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Store Postcode (origin)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={storePostcode}
              onChange={e => setStorePostcode(e.target.value.toUpperCase())}
              placeholder="E1 6RF"
            />
            <p className="text-xs text-muted-foreground mt-1">Used to calculate delivery distance from customer postcode</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Maximum Delivery Radius (km)</label>
            <input
              type="number"
              min={0.5}
              step={0.5}
              className="w-32 border rounded-lg px-3 py-2 text-sm"
              value={maxRadius}
              onChange={e => setMaxRadius(parseFloat(e.target.value))}
            />
            <p className="text-xs text-muted-foreground mt-1">Orders outside this radius will be blocked at checkout</p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label className="block text-sm font-medium mb-1">Next Day Delivery Premium (pence)</label>
              <input
                type="number"
                min={0}
                step={1}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={nextDayPremium}
                onChange={e => setNextDayPremium(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">Added on top of distance fee. e.g. 200 = £2.00 extra. Currently: <strong>£{(nextDayPremium / 100).toFixed(2)}</strong></p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Free Delivery Threshold (pence)</label>
              <input
                type="number"
                min={0}
                step={100}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={freeThreshold}
                onChange={e => setFreeThreshold(parseInt(e.target.value, 10) || 0)}
              />
              <p className="text-xs text-muted-foreground mt-1">Cart subtotal for free delivery. e.g. 5500 = £55. Currently: <strong>£{(freeThreshold / 100).toFixed(0)}</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Mode */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Pricing Mode</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPricingMode('tiers')}
              className={`border rounded-xl p-4 text-left transition ${pricingMode === 'tiers' ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm mb-1">Distance Tiers</div>
              <div className="text-xs text-muted-foreground">Fixed price per distance band. Best for delivery services or flat-rate pricing.</div>
            </button>
            <button
              onClick={() => setPricingMode('per_km')}
              className={`border rounded-xl p-4 text-left transition ${pricingMode === 'per_km' ? 'border-primary bg-primary/5' : 'hover:border-gray-300'}`}
            >
              <div className="font-semibold text-sm mb-1">Per-Kilometre Rate</div>
              <div className="text-xs text-muted-foreground">Base fee + pence per km. Best for personal car/van deliveries — covers your petrol costs.</div>
            </button>
          </div>

          {pricingMode === 'per_km' && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium mb-1">Base Fee (pence)</label>
                <input type="number" min={0} className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={baseFee} onChange={e => setBaseFee(parseInt(e.target.value, 10))} />
                <p className="text-xs text-muted-foreground">e.g. 99 = £0.99 base charge</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate per km (pence)</label>
                <input type="number" min={1} className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={perKmPrice} onChange={e => setPerKmPrice(parseInt(e.target.value, 10))} />
                <p className="text-xs text-muted-foreground">e.g. 28 = 28p/km ≈ HMRC 45p/mile</p>
              </div>
              <div className="col-span-2 text-xs bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                Example: 3.5 km delivery = £{((baseFee + 3.5 * perKmPrice) / 100).toFixed(2)} ({(baseFee/100).toFixed(2)} base + {(3.5 * perKmPrice / 100).toFixed(2)} mileage)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tiers (only shown in tiers mode) */}
      {pricingMode === 'tiers' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Delivery Tiers</CardTitle>
              <Button size="sm" variant="outline" onClick={addTier}><Plus className="w-4 h-4 mr-1" /> Add Tier</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-xs font-semibold text-muted-foreground px-2">
                <span>Label</span><span>From (km)</span><span>To (km)</span><span>Price (£)</span><span></span>
              </div>
              {tiers.map((tier, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                  <input
                    className="border rounded-lg px-2 py-1.5 text-sm"
                    value={tier.label ?? ''}
                    onChange={e => updateTier(idx, 'label', e.target.value)}
                    placeholder="e.g. Local"
                  />
                  <input type="number" min={0} step={0.5} className="border rounded-lg px-2 py-1.5 text-sm"
                    value={tier.fromKm} onChange={e => updateTier(idx, 'fromKm', parseFloat(e.target.value))} />
                  <input type="number" min={0} step={0.5} className="border rounded-lg px-2 py-1.5 text-sm"
                    value={tier.toKm} onChange={e => updateTier(idx, 'toKm', parseFloat(e.target.value))} />
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                    <input type="number" min={0} step={0.01} className="border rounded-lg pl-5 pr-2 py-1.5 text-sm w-full"
                      value={(tier.priceMinor / 100).toFixed(2)}
                      onChange={e => updateTier(idx, 'priceMinor', Math.round(parseFloat(e.target.value) * 100))} />
                  </div>
                  <button onClick={() => removeTier(idx)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">✓ Delivery settings saved successfully.</p>}

      <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full sm:w-auto">
        <Save className="w-4 h-4 mr-2" />
        {updateMutation.isPending ? 'Saving…' : 'Save Delivery Settings'}
      </Button>
    </div>
  );
}
