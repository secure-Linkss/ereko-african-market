'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Trash2, Edit2, X, ImageIcon, BadgePercent, Ticket } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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

// ─── Animations ───────────────────────────────────────────────────────────────
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

// ─── Main Discounts Tab ───────────────────────────────────────────────────────

export function DiscountsTab() {
  const [subTab, setSubTab] = React.useState<'codes' | 'products'>('codes');
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-black tracking-tight">Discounts & Offers</h2>
        <div className="h-1 w-20 bg-gradient-to-r from-primary to-primary/20 rounded-full" />
      </div>

      <div className="flex gap-4 border-b border-border/50 relative">
        {(['codes', 'products'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`relative px-4 py-3 text-sm font-bold transition-colors ${subTab === t ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t === 'codes' ? 'Discount Codes' : 'Product Discounts'}
            {subTab === t && (
              <motion.div
                layoutId="discount-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>
      <motion.div
        key={subTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {subTab === 'codes' && <DiscountCodesSubTab />}
        {subTab === 'products' && <ProductDiscountsSubTab />}
      </motion.div>
    </div>
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
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-2 shadow-md hover:shadow-lg transition-all rounded-full px-5">
          <Plus className="w-4 h-4" /> New Discount Code
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-primary/20 shadow-xl bg-background/50 backdrop-blur-sm mb-6">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-primary" /> Create Discount Code
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Code *</label>
                    <input
                      value={form.code}
                      onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9\-]/g, '') }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-mono font-bold focus:outline-none focus:border-primary transition-colors" placeholder="WELCOME20"
                      maxLength={20} required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount Type *</label>
                    <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as DiscountType }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors">
                      <option value="PERCENTAGE">Percentage (%) — e.g. 20 = 20% off</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (£) — e.g. 5 = £5 off</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {form.type === 'PERCENTAGE' ? 'Percentage Value (1–99)' : 'Amount (£)'} *
                    </label>
                    <input
                      type="number"
                      step={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                      min={form.type === 'PERCENTAGE' ? '1' : '0.01'}
                      max={form.type === 'PERCENTAGE' ? '99' : undefined}
                      value={form.value}
                      onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors"
                      placeholder={form.type === 'PERCENTAGE' ? '20' : '5.00'} required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Min Order Value (£)</label>
                    <input type="number" step="0.01" min="0" value={form.minOrderValuePounds}
                      onChange={e => setForm(f => ({ ...f, minOrderValuePounds: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors" placeholder="0.00 = no minimum" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Max Total Uses</label>
                    <input type="number" min="1" value={form.maxUses}
                      onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors" placeholder="Leave blank = unlimited" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Expiry Date & Time</label>
                    <input type="datetime-local" value={form.expiresAt}
                      onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lock to Customer Email</label>
                    <input type="email" value={form.customerEmail}
                      onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors" placeholder="Leave blank for public" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Internal Description</label>
                    <input value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full border-b-2 border-border/50 bg-transparent px-0 py-2 text-sm font-bold focus:outline-none focus:border-primary transition-colors" placeholder="e.g. Welcome offer for new customers" maxLength={200} />
                  </div>
                  <div className="flex items-center gap-4 md:col-span-2 py-2">
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                      className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${form.isActive ? 'bg-primary' : 'bg-muted border'}`}
                    >
                      <motion.div 
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ x: form.isActive ? 26 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      />
                    </button>
                    <span className="text-sm font-medium">{form.isActive ? 'Active — customers can use this code immediately' : 'Inactive — hidden from customers'}</span>
                  </div>
                  {formError && <p className="text-destructive text-sm md:col-span-2 font-bold">{formError}</p>}
                  <div className="flex gap-3 md:col-span-2 justify-end pt-4 border-t border-border/50">
                    <Button type="button" variant="ghost" onClick={resetForm} className="rounded-full">Cancel</Button>
                    <Button type="submit" disabled={createMutation.isPending} className="rounded-full shadow-md hover:shadow-lg">
                      {createMutation.isPending ? 'Creating...' : 'Create Code'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      ) : codes.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="border-dashed border-2">
            <CardContent className="p-16 text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="inline-block"
              >
                <Ticket className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              </motion.div>
              <p className="text-muted-foreground text-base font-medium">No discount codes yet. Create your first code above.</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
          {codes.map((code) => {
            const isExpired = code.expiresAt ? new Date(code.expiresAt) < new Date() : false;
            const isMaxed = code.maxUses !== null && code.usesCount >= code.maxUses;
            const isInvalid = !code.isActive || isExpired || isMaxed;
            return (
              <motion.div key={code.id} variants={fadeUp}>
                <Card className={`overflow-hidden transition-all hover:shadow-md ${isInvalid ? 'opacity-60 bg-muted/20' : 'bg-background/40 backdrop-blur-md border-border/60 shadow-sm'}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 px-4 py-2 rounded-xl flex-shrink-0 shadow-inner">
                        <span className="font-mono font-black text-lg tracking-widest text-primary drop-shadow-sm">{code.code}</span>
                      </div>
                      <div className="flex flex-col gap-2 flex-1 min-w-0 py-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-md shadow-sm ${code.type === 'PERCENTAGE' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'}`}>
                            {code.type === 'PERCENTAGE' ? `${code.value}% OFF` : `£${(code.value / 100).toFixed(2)} OFF`}
                          </span>
                          {code.minOrderValueMinor > 0 && (
                            <span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-1 rounded-md">
                              Min £{(code.minOrderValueMinor / 100).toFixed(2)}
                            </span>
                          )}
                          {code.customerEmail && (
                            <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-1 rounded-md border border-purple-200">
                              🔒 {code.customerEmail}
                            </span>
                          )}
                          {isExpired && <span className="text-xs text-destructive font-bold bg-destructive/10 px-2 py-1 rounded-md">Expired</span>}
                          {isMaxed && !isExpired && <span className="text-xs text-destructive font-bold bg-destructive/10 px-2 py-1 rounded-md">Max uses reached</span>}
                          {code.expiresAt && !isExpired && (
                            <span className="text-xs text-muted-foreground font-medium">
                              Expires {new Date(code.expiresAt).toLocaleDateString('en-GB')}
                            </span>
                          )}
                        </div>
                        {code.description && <p className="text-sm text-muted-foreground font-medium">{code.description}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">{code.usesCount} / {code.maxUses ?? '∞'} uses</span>
                          <button
                            onClick={() => updateMutation.mutate({ id: code.id, isActive: !code.isActive })}
                            disabled={updateMutation.isPending}
                            title={code.isActive ? 'Deactivate' : 'Activate'}
                            className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${code.isActive ? 'bg-primary' : 'bg-muted border'}`}
                          >
                            <motion.div 
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                              animate={{ x: code.isActive ? 22 : 2 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(code.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm">
            <Card className="shadow-2xl border-destructive/20">
              <CardContent className="p-6 space-y-4">
                <p className="font-black text-xl text-foreground">Delete discount code?</p>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">This cannot be undone. All usage records will also be deleted.</p>
                <div className="flex gap-3 justify-end pt-2">
                  <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-full">Cancel</Button>
                  <Button variant="destructive" disabled={deleteMutation.isPending} className="rounded-full shadow-md hover:shadow-lg"
                    onClick={async () => { await deleteMutation.mutateAsync(deleteConfirm!); setDeleteConfirm(null); }}>
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
    <div className="space-y-6">
      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 shadow-inner">
        <p className="text-sm text-primary/80 font-medium leading-relaxed">
          Enable a sale discount on any product. A luxury coloured stamp badge will animate onto the product image in the storefront, and the discounted price will be highlighted. Disable anytime to restore original pricing — no product data is permanently modified.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      ) : products.length === 0 ? (
        <Card className="border-dashed"><CardContent className="p-12 text-center text-muted-foreground font-medium">No products found.</CardContent></Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              <motion.div key={product.id} variants={fadeUp}>
                <Card className={`overflow-hidden transition-all duration-300 ${product.discountEnabled ? 'border-primary/40 bg-gradient-to-br from-primary/5 to-transparent shadow-md' : 'hover:shadow-sm bg-background/50'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-xl overflow-hidden shadow-sm border border-border/50">
                        {primaryImage
                          ? <img src={primaryImage} alt={product.title} className="w-full h-full object-cover mix-blend-multiply p-1" />
                          : <div className="w-full h-full bg-muted flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground/30" /></div>
                        }
                        <AnimatePresence>
                          {product.discountEnabled && badgeInfo && (
                            <motion.div 
                              initial={{ scale: 0, rotate: -20 }}
                              animate={{ scale: 1, rotate: -10 }}
                              exit={{ scale: 0 }}
                              transition={{ type: "spring", stiffness: 400, damping: 15 }}
                              className={`absolute -bottom-2 -right-2 text-white font-black flex flex-col items-center justify-center w-8 h-8 rounded-full shadow-lg ring-2 ring-white ${badgeInfo.color}`}
                            >
                              <span className="text-[10px] leading-none">-{product.discountPercent}%</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      <div className="flex-1 min-w-0 py-1">
                        <p className="font-bold text-sm leading-tight mb-1 truncate">{product.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {salePrice ? (
                            <>
                              <span className="text-lg font-black text-primary">£{(salePrice / 100).toFixed(2)}</span>
                              <span className="text-xs font-semibold text-muted-foreground line-through">£{(pricePence / 100).toFixed(2)}</span>
                              {badgeInfo && <span className={`text-[9px] font-black tracking-wider text-white px-1.5 py-0.5 rounded uppercase shadow-sm ${badgeInfo.color}`}>{badgeInfo.label}</span>}
                            </>
                          ) : (
                            <span className="text-sm font-bold text-muted-foreground">£{(pricePence / 100).toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 flex-shrink-0 pt-1">
                        {product.discountEnabled ? (
                          <>
                            <Button size="sm" variant="outline" className="text-xs h-7 px-3 rounded-full hover:bg-muted font-bold"
                              onClick={() => { setEditId(isEditing ? null : product.id); setEditForm({ discountPercent: String(product.discountPercent ?? ''), discountBadge: (product.discountBadge ?? 'SALE') as DiscountBadge }); setSaveError(''); }}>
                              <Edit2 className="w-3 h-3 mr-1" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 px-3 rounded-full text-destructive hover:bg-destructive/10 font-bold"
                              onClick={() => handleDisable(product)} disabled={setDiscountMutation.isPending}>
                              <X className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" className="text-xs h-8 px-4 rounded-full shadow-md font-bold"
                            onClick={() => { setEditId(isEditing ? null : product.id); setEditForm({ discountPercent: '', discountBadge: 'SALE' }); setSaveError(''); }}>
                            <BadgePercent className="w-3.5 h-3.5 mr-1" /> Add Discount
                          </Button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {isEditing && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pt-5 border-t border-border/50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Discount % (1–90) *</label>
                                <div className="flex items-center gap-2">
                                  <input type="number" min="1" max="90" step="1" value={editForm.discountPercent}
                                    onChange={e => setEditForm(f => ({ ...f, discountPercent: e.target.value }))}
                                    className="w-24 border-b-2 border-border bg-transparent px-2 py-1.5 text-lg font-black focus:outline-none focus:border-primary transition-colors text-center" placeholder="15" />
                                  <span className="text-sm font-bold text-muted-foreground">% off</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Badge Style</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {BADGE_OPTIONS.map((b) => (
                                    <button key={b.value} type="button"
                                      onClick={() => setEditForm(f => ({ ...f, discountBadge: b.value }))}
                                      className={`text-[10px] font-black px-2.5 py-1.5 rounded shadow-sm transition-all duration-300 ${b.color} ${editForm.discountBadge === b.value ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'opacity-60 hover:opacity-100 hover:scale-105'} text-white`}>
                                      {b.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {previewPrice !== null && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                  className="bg-primary/5 rounded-xl p-3 flex flex-wrap items-center gap-3 border border-primary/10 shadow-inner"
                                >
                                  <BadgePercent className="w-5 h-5 text-primary flex-shrink-0" />
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">Preview:</span>
                                    <span className="text-sm font-semibold line-through text-muted-foreground">£{(pricePence / 100).toFixed(2)}</span>
                                    <span className="text-lg font-black text-primary">£{(previewPrice / 100).toFixed(2)}</span>
                                    <span className={`text-[10px] font-black text-white px-2 py-1 rounded shadow-sm ${BADGE_OPTIONS.find(b => b.value === editForm.discountBadge)?.color}`}>
                                      {editForm.discountBadge?.replace('_', ' ')}
                                    </span>
                                  </div>
                                  <motion.div 
                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                    className="ml-auto bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full shadow-sm border border-emerald-200"
                                  >
                                    SAVE £{((pricePence - previewPrice) / 100).toFixed(2)}
                                  </motion.div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            {saveError && <p className="text-destructive text-sm font-bold">{saveError}</p>}
                            <div className="flex gap-3 justify-end pt-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => { setEditId(null); setSaveError(''); }} className="rounded-full font-bold">Cancel</Button>
                              <Button size="sm" onClick={() => handleSave(product)} disabled={setDiscountMutation.isPending} className="rounded-full shadow-md font-bold">
                                {setDiscountMutation.isPending ? 'Saving...' : 'Apply Discount'}
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
