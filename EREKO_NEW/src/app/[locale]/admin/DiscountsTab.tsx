'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Trash2, Edit2, X, ImageIcon, BadgePercent, Ticket } from 'lucide-react';
import {
  useAdminDiscountCodes, useCreateDiscountCode, useUpdateDiscountCode,
  useDeleteDiscountCode, useSetProductDiscount,
  DiscountCode, DiscountBadge, DiscountType,
} from '@/services/discounts';
import { useAdminProducts } from '@/services/admin';

// ─── Badge config ─────────────────────────────────────────────────────────────

const BADGE_OPTIONS: { value: DiscountBadge; label: string; color: string }[] = [
  { value: 'SALE',      label: 'SALE',      color: 'bg-red-500' },
  { value: 'HOT_DEAL',  label: 'HOT DEAL',  color: 'bg-orange-500' },
  { value: 'LIMITED',   label: 'LIMITED',   color: 'bg-purple-500' },
  { value: 'CLEARANCE', label: 'CLEARANCE', color: 'bg-blue-500' },
  { value: 'NEW_PRICE', label: 'NEW PRICE', color: 'bg-emerald-500' },
  { value: 'SPECIAL',   label: 'SPECIAL',   color: 'bg-amber-500' },
];

// ─── Main Discounts Tab ───────────────────────────────────────────────────────

export function DiscountsTab() {
  const [subTab, setSubTab] = React.useState<'codes' | 'products'>('codes');
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Discounts</h2>
      </div>
      <div className="flex gap-2 border-b border-border">
        {(['codes', 'products'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'codes' ? 'Discount Codes' : 'Product Discounts'}
          </button>
        ))}
      </div>
      {subTab === 'codes' && <DiscountCodesSubTab />}
      {subTab === 'products' && <ProductDiscountsSubTab />}
    </>
  );
}

// ─── Discount Codes Sub-Tab ───────────────────────────────────────────────────

function DiscountCodesSubTab() {
  const { data: codes = [], isLoading } = useAdminDiscountCodes(true);
  const createMutation = useCreateDiscountCode();
  const updateMutation = useUpdateDiscountCode();
  const deleteMutation = useDeleteDiscountCode();
  const [showForm, setShowForm] = React.useState(false);
  const [form, setForm] = React.useState({
    code: '', type: 'PERCENTAGE' as DiscountType, value: '', minOrderValuePounds: '',
    maxUses: '', expiresAt: '', customerEmail: '', description: '', isActive: true,
  });
  const [formError, setFormError] = React.useState('');
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);

  function resetForm() {
    setForm({ code: '', type: 'PERCENTAGE', value: '', minOrderValuePounds: '', maxUses: '', expiresAt: '', customerEmail: '', description: '', isActive: true });
    setFormError('');
    setShowForm(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.code.trim()) { setFormError('Code is required'); return; }
    if (!/^[A-Z0-9\-]+$/.test(form.code)) { setFormError('Code must be uppercase letters, digits, or hyphens only'); return; }
    const value = parseFloat(form.value);
    if (isNaN(value) || value <= 0) { setFormError('Value must be a positive number'); return; }
    if (form.type === 'PERCENTAGE' && value >= 100) { setFormError('Percentage must be less than 100'); return; }
    try {
      await createMutation.mutateAsync({
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: form.type === 'FIXED_AMOUNT' ? Math.round(value * 100) : value,
        minOrderValueMinor: form.minOrderValuePounds ? Math.round(parseFloat(form.minOrderValuePounds) * 100) : 0,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        customerEmail: form.customerEmail || undefined,
        description: form.description || undefined,
        isActive: form.isActive,
      });
      resetForm();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || String(err?.message) || 'Failed to create code');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> New Discount Code
        </Button>
      </div>

      {showForm && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4 text-primary" /> Create Discount Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Code *</label>
                <input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '') }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono" placeholder="WELCOME20"
                  maxLength={20} required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Discount Type *</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DiscountType }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="PERCENTAGE">Percentage (%) — e.g. 20 = 20% off</option>
                  <option value="FIXED_AMOUNT">Fixed Amount (£) — e.g. 5 = £5 off</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {form.type === 'PERCENTAGE' ? 'Percentage Value (1–99)' : 'Amount (£)'} *
                </label>
                <input
                  type="number"
                  step={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                  min={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                  max={form.type === 'PERCENTAGE' ? '99' : undefined}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder={form.type === 'PERCENTAGE' ? '20' : '5.00'} required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Order Value (£)</label>
                <input type="number" step="0.01" min="0" value={form.minOrderValuePounds}
                  onChange={e => setForm(f => ({ ...f, minOrderValuePounds: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00 = no minimum" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max Total Uses</label>
                <input type="number" min="1" value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave blank = unlimited" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiry Date & Time</label>
                <input type="datetime-local" value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lock to Customer Email</label>
                <input type="email" value={form.customerEmail}
                  onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Leave blank for public" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Internal Description</label>
                <input value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Welcome offer for new customers" maxLength={200} />
              </div>
              <div className="flex items-center gap-3 md:col-span-2">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${form.isActive ? 'bg-primary' : 'bg-muted border'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm">{form.isActive ? 'Active — customers can use this code immediately' : 'Inactive — hidden from customers'}</span>
              </div>
              {formError && <p className="text-destructive text-xs md:col-span-2 font-medium">{formError}</p>}
              <div className="flex gap-2 md:col-span-2 justify-end">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Code'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Ticket className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No discount codes yet. Create your first code above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {codes.map((code) => {
            const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
            const isMaxed = code.maxUses !== null && code.usesCount >= code.maxUses;
            const isInvalid = !code.isActive || isExpired || isMaxed;
            return (
              <Card key={code.id} className={isInvalid ? 'opacity-55' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <span className="font-mono font-black text-base tracking-wider bg-muted px-3 py-1 rounded-lg">{code.code}</span>
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${code.type === 'PERCENTAGE' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {code.type === 'PERCENTAGE' ? `${code.value}% OFF` : `£${(code.value / 100).toFixed(2)} OFF`}
                      </span>
                      {code.minOrderValueMinor > 0 && (
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                          Min £{(code.minOrderValueMinor / 100).toFixed(2)}
                        </span>
                      )}
                      {code.customerEmail && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                          🔒 {code.customerEmail}
                        </span>
                      )}
                      {isExpired && <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full">Expired</span>}
                      {isMaxed && !isExpired && <span className="text-xs text-destructive font-semibold bg-destructive/10 px-2 py-0.5 rounded-full">Max uses reached</span>}
                      {code.expiresAt && !isExpired && (
                        <span className="text-xs text-muted-foreground">
                          Expires {new Date(code.expiresAt).toLocaleDateString('en-GB')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                      <span className="text-xs text-muted-foreground">{code.usesCount} / {code.maxUses ?? '∞'} uses</span>
                      <button
                        onClick={() => updateMutation.mutate({ id: code.id, isActive: !code.isActive })}
                        disabled={updateMutation.isPending}
                        title={code.isActive ? 'Deactivate' : 'Activate'}
                        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${code.isActive ? 'bg-primary' : 'bg-muted border'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${code.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(code.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {code.description && <p className="text-xs text-muted-foreground mt-1.5 pl-1 italic">{code.description}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <p className="font-bold text-base">Delete discount code?</p>
              <p className="text-sm text-muted-foreground">This cannot be undone. All usage records will also be deleted.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" disabled={deleteMutation.isPending}
                  onClick={async () => { await deleteMutation.mutateAsync(deleteConfirm!); setDeleteConfirm(null); }}>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Product Discounts Sub-Tab ────────────────────────────────────────────────

function ProductDiscountsSubTab() {
  const { data: productsData, isLoading } = useAdminProducts(100);
  const setDiscountMutation = useSetProductDiscount();
  const products = (productsData?.products ?? []) as any[];
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState<{ discountPercent: string; discountBadge: DiscountBadge }>({ discountPercent: '', discountBadge: 'SALE' });
  const [saveError, setSaveError] = React.useState('');

  async function handleSave(product: any) {
    setSaveError('');
    const pct = parseFloat(editForm.discountPercent);
    if (isNaN(pct) || pct < 1 || pct > 90) { setSaveError('Enter a percentage between 1 and 90'); return; }
    try {
      await setDiscountMutation.mutateAsync({ productId: product.id, discountEnabled: true, discountPercent: pct, discountBadge: editForm.discountBadge });
      setEditId(null);
    } catch (err: any) {
      setSaveError(err?.response?.data?.message || 'Failed to save');
    }
  }

  async function handleDisable(product: any) {
    await setDiscountMutation.mutateAsync({ productId: product.id, discountEnabled: false });
    if (editId === product.id) setEditId(null);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Enable a sale discount on any product. A coloured stamp badge will appear on the product image in the storefront, and the discounted price will be shown. Disable anytime to restore original pricing — no product data is modified.
      </p>
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : products.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No products found.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {products.map((product: any) => {
            const isEditing = editId === product.id;
            const primaryImage = product.images?.[0]?.url;
            const variant = product.variants?.[0];
            const pricePence = variant?.priceAmountMinor ?? 0;
            const salePrice = product.discountEnabled && product.discountPercent
              ? Math.round(pricePence * (1 - product.discountPercent / 100)) : null;
            const badgeInfo = BADGE_OPTIONS.find(b => b.value === product.discountBadge);
            const previewPct = parseFloat(editForm.discountPercent);
            const previewPrice = isEditing && !isNaN(previewPct) && previewPct > 0
              ? Math.round(pricePence * (1 - previewPct / 100)) : null;

            return (
              <Card key={product.id} className={product.discountEnabled ? 'border-primary/30 bg-primary/[0.02]' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 flex-shrink-0">
                      {primaryImage
                        ? <img src={primaryImage} alt={product.title} className="w-12 h-12 object-cover rounded-lg" />
                        : <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center"><ImageIcon className="w-5 h-5 text-muted-foreground" /></div>
                      }
                      {product.discountEnabled && (
                        <div className={`absolute -top-1.5 -right-1.5 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md ${badgeInfo?.color ?? 'bg-red-500'}`}>
                          -{product.discountPercent}%
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{product.title}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {salePrice ? (
                          <>
                            <span className="text-xs text-muted-foreground line-through">£{(pricePence / 100).toFixed(2)}</span>
                            <span className="text-xs font-bold text-primary">£{(salePrice / 100).toFixed(2)}</span>
                            {badgeInfo && <span className={`text-[10px] font-black text-white px-1.5 py-0.5 rounded ${badgeInfo.color}`}>{badgeInfo.label}</span>}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">£{(pricePence / 100).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {product.discountEnabled ? (
                        <>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2 gap-1"
                            onClick={() => { setEditId(isEditing ? null : product.id); setEditForm({ discountPercent: String(product.discountPercent ?? ''), discountBadge: (product.discountBadge ?? 'SALE') as DiscountBadge }); setSaveError(''); }}>
                            <Edit2 className="w-3 h-3" /> Edit
                          </Button>
                          <Button size="sm" variant="destructive" className="text-xs h-7 px-2 gap-1"
                            onClick={() => handleDisable(product)} disabled={setDiscountMutation.isPending}>
                            <X className="w-3 h-3" /> Remove
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" className="text-xs h-7 px-2 gap-1"
                          onClick={() => { setEditId(isEditing ? null : product.id); setEditForm({ discountPercent: '', discountBadge: 'SALE' }); setSaveError(''); }}>
                          <BadgePercent className="w-3 h-3" /> Add Discount
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Discount % (1–90) *</label>
                          <div className="flex items-center gap-2">
                            <input type="number" min="1" max="90" step="1" value={editForm.discountPercent}
                              onChange={e => setEditForm(f => ({ ...f, discountPercent: e.target.value }))}
                              className="w-24 border rounded-lg px-3 py-2 text-sm font-bold" placeholder="15" />
                            <span className="text-sm font-semibold text-muted-foreground">% off</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Badge Stamp Style</label>
                          <div className="flex flex-wrap gap-1.5">
                            {BADGE_OPTIONS.map((b) => (
                              <button key={b.value} type="button"
                                onClick={() => setEditForm(f => ({ ...f, discountBadge: b.value }))}
                                className={`text-[11px] font-black px-2 py-1 rounded text-white transition-all ${b.color} ${editForm.discountBadge === b.value ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : 'opacity-55 hover:opacity-90'}`}>
                                {b.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      {previewPrice !== null && (
                        <div className="bg-muted/50 rounded-xl p-3 flex items-center gap-3">
                          <BadgePercent className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground mr-2">Preview:</span>
                            <span className="text-sm line-through text-muted-foreground mr-1">£{(pricePence / 100).toFixed(2)}</span>
                            <span className="text-sm font-bold text-primary mr-2">£{(previewPrice / 100).toFixed(2)}</span>
                            <span className={`text-[11px] font-black text-white px-1.5 py-0.5 rounded mr-2 ${BADGE_OPTIONS.find(b => b.value === editForm.discountBadge)?.color}`}>
                              {editForm.discountBadge?.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-emerald-600 font-semibold">
                              Save £{((pricePence - previewPrice) / 100).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      {saveError && <p className="text-destructive text-xs font-medium">{saveError}</p>}
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={() => { setEditId(null); setSaveError(''); }}>Cancel</Button>
                        <Button size="sm" onClick={() => handleSave(product)} disabled={setDiscountMutation.isPending}>
                          {setDiscountMutation.isPending ? 'Saving...' : 'Apply Discount'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
