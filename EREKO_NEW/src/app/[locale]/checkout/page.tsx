'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Check, CreditCard, MapPin, Truck, ChevronRight, Loader2, Lock, ShoppingBag, Store, Package, Tag, X, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useStartCheckout, useCreatePaymentIntent, useConfirmCheckout, useSyncCart, useConfirmInStore } from '@/services/checkout';
import { useValidateDiscount, ValidateDiscountResponse } from '@/services/discounts';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const STORE_ADDRESS = {
  line1: '5 Broadway',
  city: 'Barking',
  postcode: 'IG11 7LS',
  countryCode: 'GB',
  phone: '02036337503',
};

const contactSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  newsletter: z.boolean().optional(),
});
const addressSchema = z.discriminatedUnion('fulfillment', [
  z.object({
    fulfillment: z.literal('delivery'),
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    postcode: z.string().min(3, 'Required'),
    line1: z.string().min(1, 'Required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'Required'),
    phone: z.string().min(7, 'Required'),
    deliveryMethod: z.enum(['standard', 'nextday']),
  }),
  z.object({
    fulfillment: z.literal('collect'),
    firstName: z.string().min(1, 'Required'),
    lastName: z.string().min(1, 'Required'),
    phone: z.string().min(7, 'Required'),
    postcode: z.string().optional(),
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    deliveryMethod: z.literal('collect').optional(),
  }),
]);

type ContactForm = z.infer<typeof contactSchema>;
type AddressForm = z.infer<typeof addressSchema>;
type DeliveryAddressForm = Extract<AddressForm, { fulfillment: 'delivery' }>;
type CollectForm = Extract<AddressForm, { fulfillment: 'collect' }>;

function formatGBP(minor: number) {
  return `£${(minor / 100).toFixed(2)}`;
}

function StepBadge({ n, complete, active }: { n: number; complete: boolean; active: boolean }) {
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${
      complete ? 'bg-emerald-500 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
    }`}>
      {complete ? <Check className="w-4 h-4" /> : n}
    </div>
  );
}

function StripePaymentForm({ clientSecret, orderId, shippingAddress, onSuccess, onError }: {
  clientSecret: string;
  orderId: string;
  shippingAddress: any;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmMutation = useConfirmCheckout();
  const [processing, setProcessing] = useState(false);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });
      if (error) {
        onError(error.message ?? 'Payment failed');
        setProcessing(false);
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        const dm = (shippingAddress as any)?._deliveryMethod ?? 'standard';
        await confirmMutation.mutateAsync({
          orderId,
          paymentIntentId: paymentIntent.id,
          billingAddressSameAsShipping: true,
          shippingAddress,
          deliveryMethod: dm,
        });
        onSuccess();
      }
    } catch (err: any) {
      onError(err?.response?.data?.detail ?? err?.message ?? 'Payment error');
      setProcessing(false);
    }
  }

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      <Button type="submit" size="lg" className="w-full h-14 text-lg bg-emerald-600 hover:bg-emerald-700 text-white" disabled={!stripe || processing}>
        {processing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : <><Lock className="w-4 h-4 mr-2" /> Pay Securely</>}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [contactData, setContactData] = useState<ContactForm | null>(null);
  const [addressData, setAddressData] = useState<AddressForm | null>(null);
  const [fulfillment, setFulfillment] = useState<'delivery' | 'collect'>('delivery');
  const [paymentMode, setPaymentMode] = useState<'card' | 'in_store'>('card');
  const [checkoutData, setCheckoutData] = useState<{ orderId: string; clientSecret: string; publishableKey: string } | null>(null);
  const [inStoreOrderId, setInStoreOrderId] = useState<string | null>(null);
  const [stepError, setStepError] = useState('');
  const [success, setSuccess] = useState(false);

  // Discount / promo code state
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState<ValidateDiscountResponse | null>(null);
  const [promoError, setPromoError] = useState('');
  const [promoValidating, setPromoValidating] = useState(false);
  const validateDiscount = useValidateDiscount();

  const { items, getSubtotalMinor, shippingMinor, discountMinor, promoCode, removePromo, clearCart } = useCartStore();

  // Pre-populate promoResult from cart store if user already applied a code on cart page
  React.useEffect(() => {
    if (promoCode && discountMinor > 0 && !promoResult) {
      setPromoResult({ valid: true, code: promoCode, discountAmountMinor: discountMinor, message: 'Applied', codeId: '', type: 'FIXED_AMOUNT', value: discountMinor, finalTotalMinor: subtotal - discountMinor });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { user } = useAuthStore();
  const syncCart = useSyncCart();
  const startCheckout = useStartCheckout();
  const createPaymentIntent = useCreatePaymentIntent();
  const confirmInStore = useConfirmInStore();

  const subtotal = getSubtotalMinor();
  const isCollect = fulfillment === 'collect';
  const activeShipping = subtotal >= 5500 ? 0 : shippingMinor;
  // Use server-calculated delivery fee after checkout started; fall back to local estimate
  const [serverDeliveryFee, setServerDeliveryFee] = React.useState<{ feeMinor: number; feeLabel: string; distanceKm: number } | null>(null);
  const deliveryFee = isCollect ? 0 : (serverDeliveryFee?.feeMinor ?? (activeShipping || 399));
  const deliveryFeeLabel = isCollect ? 'Free (Click & Collect)' : (serverDeliveryFee?.feeLabel ?? 'Delivery');
  const promoDiscountMinor = promoResult?.valid ? promoResult.discountAmountMinor : 0;
  const total = Math.max(0, subtotal - promoDiscountMinor) + deliveryFee;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: user?.email ?? '', newsletter: false },
  });
  const addressForm = useForm<any>({
    defaultValues: {
      fulfillment: 'delivery',
      deliveryMethod: 'standard',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    },
  });

  // Success screen takes priority — must come before empty-cart check
  // because clearCart() and setSuccess(true) may not batch across Zustand+React
  if (success) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-6 max-w-md">
          <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold">Order Confirmed!</h1>
          <p className="text-muted-foreground">Thank you for your order. You'll receive a confirmation email shortly.</p>
          <div className="flex gap-4 justify-center">
            <Link href={`/${locale}/account`}><Button variant="outline">View Orders</Button></Link>
            <Link href={`/${locale}/shop`}><Button>Continue Shopping</Button></Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground opacity-40" />
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <Link href={`/${locale}/shop`}><Button>Browse the shop</Button></Link>
        </div>
      </main>
    );
  }

  async function handleApplyPromo() {
    if (!promoInput.trim()) return;
    setPromoError('');
    setPromoValidating(true);
    try {
      const result = await validateDiscount.mutateAsync({
        code: promoInput.toUpperCase().trim(),
        cartTotalMinor: subtotal,
        email: contactData?.email,
      });
      setPromoResult(result);
      if (!result.valid) setPromoError(result.message);
    } catch {
      setPromoError('Failed to validate code. Please try again.');
    } finally {
      setPromoValidating(false);
    }
  }

  function handleRemovePromo() {
    setPromoResult(null);
    setPromoInput('');
    setPromoError('');
    removePromo(); // also clear from cart store if promo was applied there
  }

  async function onContactSubmit(data: ContactForm) {
    setContactData(data);
    setStep(2);
  }

  async function onAddressSubmit(data: any) {
    setStepError('');
    const formData = { ...data, fulfillment };
    setAddressData(formData);
    try {
      // 1. Sync local Zustand cart to server → get real cart ID
      const synced = await syncCart.mutateAsync({
        items: items.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      });
      const cartId = synced.id;
      const postcode = isCollect ? STORE_ADDRESS.postcode : (data.postcode ?? '');

      // 2. Start checkout (reserves stock, creates order, applies discount code server-side)
      const startRes = await startCheckout.mutateAsync({
        postcode,
        cartId,
        email: contactData!.email,
        firstName: data.firstName,
        lastName: data.lastName,
        isClickAndCollect: isCollect,
        discountCode: promoResult?.valid ? promoResult.code : (promoCode ?? undefined),
      });

      // Update delivery fee from server response
      if (startRes.deliveryFee) {
        setServerDeliveryFee(startRes.deliveryFee);
      }

      // 3a. Pay in store — skip Stripe, confirm directly
      if (isCollect && paymentMode === 'in_store') {
        const shippingAddress = {
          firstName: data.firstName,
          lastName: data.lastName,
          line1: STORE_ADDRESS.line1,
          city: STORE_ADDRESS.city,
          postcode: STORE_ADDRESS.postcode,
          countryCode: 'GB',
          phone: data.phone,
        };
        await confirmInStore.mutateAsync({ orderId: startRes.orderId, shippingAddress });
        setSuccess(true); // set before clearCart to avoid empty-cart flash
        clearCart();
        return;
      }

      // 3b. Online card payment — create Stripe payment intent
      const piRes = await createPaymentIntent.mutateAsync({
        orderId: startRes.orderId,
        paymentMethod: 'card',
      });
      setCheckoutData({
        orderId: startRes.orderId,
        clientSecret: piRes.clientSecret,
        publishableKey: piRes.publishableKey,
      });
      setStep(3);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? err?.response?.data?.message ?? err?.message ?? 'Failed to initialise checkout. Please try again.';
      setStepError(detail);
    }
  }

  function handlePaymentSuccess() {
    setSuccess(true);
    clearCart();
  }

  const stripePromise = checkoutData?.publishableKey
    ? loadStripe(checkoutData.publishableKey)
    : null;

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
        <Link href={`/${locale}/cart`} className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block">
          ← Return to Cart
        </Link>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Lock className="w-6 h-6 text-emerald-600" /> Secure Checkout
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Checkout Steps */}
        <div className="flex-1 space-y-6">

          {/* Step 1: Contact */}
          <Card className={step < 1 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 rounded-t-xl">
              <StepBadge n={1} complete={step > 1} active={step === 1} />
              <CardTitle className="text-lg">Contact Information</CardTitle>
              {step > 1 && contactData && (
                <button onClick={() => setStep(1)} className="ml-auto text-xs text-primary hover:underline">Edit</button>
              )}
            </CardHeader>
            {step > 1 && contactData ? (
              <CardContent className="p-4 text-sm text-muted-foreground">{contactData.email}</CardContent>
            ) : step === 1 && (
              <CardContent className="p-6 space-y-4">
                <form onSubmit={contactForm.handleSubmit(onContactSubmit)} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold block mb-1">Email Address</label>
                    <Input type="email" placeholder="you@example.com" {...contactForm.register('email')} />
                    {contactForm.formState.errors.email && <p className="text-xs text-destructive mt-1">{contactForm.formState.errors.email.message}</p>}
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded text-primary w-4 h-4" {...contactForm.register('newsletter')} />
                    Email me with news and offers
                  </label>
                  <div className="flex justify-end">
                    <Button type="submit" size="lg">Continue to Delivery <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Step 2: Fulfilment */}
          <Card className={step < 2 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 rounded-t-xl">
              <StepBadge n={2} complete={step > 2} active={step === 2} />
              <CardTitle className="text-lg flex items-center gap-2">
                {isCollect ? <Store className="w-5 h-5 text-muted-foreground" /> : <MapPin className="w-5 h-5 text-muted-foreground" />}
                {isCollect ? 'Click & Collect' : 'Delivery Details'}
              </CardTitle>
              {step > 2 && addressData && (
                <button onClick={() => { setStep(2); setCheckoutData(null); }} className="ml-auto text-xs text-primary hover:underline">Edit</button>
              )}
            </CardHeader>
            {step > 2 && addressData ? (
              <CardContent className="p-4 text-sm text-muted-foreground">
                {isCollect
                  ? <span className="flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> Collect from: 5 Broadway, Barking, IG11 7LS</span>
                  : <span>{(addressData as any).firstName} {(addressData as any).lastName} · {(addressData as any).line1}, {(addressData as any).city}, {(addressData as any).postcode}</span>
                }
              </CardContent>
            ) : step === 2 && (
              <CardContent className="p-6 space-y-6">
                {/* Fulfilment selector */}
                <div>
                  <h3 className="font-semibold mb-3">How would you like to receive your order?</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillment('delivery')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${fulfillment === 'delivery' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                    >
                      <Truck className={`w-6 h-6 mb-2 ${fulfillment === 'delivery' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-sm">Home Delivery</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Delivered to your door</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillment('collect')}
                      className={`p-4 border-2 rounded-xl text-left transition-all ${fulfillment === 'collect' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'}`}
                    >
                      <Store className={`w-6 h-6 mb-2 ${fulfillment === 'collect' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-sm">Click & Collect</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Collect from our store — FREE</p>
                    </button>
                  </div>
                </div>

                <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                  {stepError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{stepError}</div>
                  )}

                  {/* Name + Phone — always needed */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1">First Name</label>
                      <Input {...addressForm.register('firstName', { required: 'Required' })} />
                      {addressForm.formState.errors.firstName && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.firstName.message)}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1">Last Name</label>
                      <Input {...addressForm.register('lastName', { required: 'Required' })} />
                      {addressForm.formState.errors.lastName && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.lastName.message)}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Phone Number</label>
                    <Input type="tel" placeholder="+44 7700 000000" {...addressForm.register('phone', { required: 'Required', minLength: { value: 7, message: 'Enter a valid phone number' } })} />
                    {addressForm.formState.errors.phone && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.phone.message)}</p>}
                  </div>

                  {/* Click & Collect info + Payment mode */}
                  {isCollect && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <Store className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">EREKO African Market</p>
                          <p className="text-sm text-muted-foreground">5 Broadway, Barking, IG11 7LS</p>
                        </div>
                      </div>

                      {/* Payment mode selector */}
                      <div>
                        <p className="font-semibold text-sm mb-2">How would you like to pay?</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPaymentMode('card')}
                            className={`p-3 border-2 rounded-xl text-left transition-all ${paymentMode === 'card' ? 'border-primary bg-white' : 'border-border bg-white/50 hover:border-muted-foreground'}`}
                          >
                            <CreditCard className={`w-4 h-4 mb-1 ${paymentMode === 'card' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="font-semibold text-xs">Pay Online</p>
                            <p className="text-xs text-muted-foreground">Card / Apple Pay</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentMode('in_store')}
                            className={`p-3 border-2 rounded-xl text-left transition-all ${paymentMode === 'in_store' ? 'border-primary bg-white' : 'border-border bg-white/50 hover:border-muted-foreground'}`}
                          >
                            <Store className={`w-4 h-4 mb-1 ${paymentMode === 'in_store' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <p className="font-semibold text-xs">Pay in Store</p>
                            <p className="text-xs text-muted-foreground">Cash or card at collection</p>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm">How it works</p>
                          <ol className="text-sm text-muted-foreground space-y-1 mt-1 list-decimal list-inside">
                            {paymentMode === 'in_store' ? (
                              <>
                                <li>Place your order — no payment now</li>
                                <li>We'll pack your items ready for collection</li>
                                <li>You'll receive a "Ready to Collect" notification</li>
                                <li>Pay cash or card when you collect</li>
                              </>
                            ) : (
                              <>
                                <li>Place your order and pay online</li>
                                <li>We'll pack your items ready for collection</li>
                                <li>You'll receive a "Ready to Collect" notification</li>
                                <li>Collect from our store during opening hours</li>
                              </>
                            )}
                          </ol>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-primary/10 text-xs text-muted-foreground">
                        <strong>Store hours:</strong> Mon–Sat 9am–8pm · Sun 10am–6pm
                      </div>
                    </div>
                  )}

                  {/* Delivery address fields — only for home delivery */}
                  {!isCollect && (
                    <>
                      <div>
                        <label className="text-sm font-semibold block mb-1">Postcode</label>
                        <Input placeholder="e.g. SW1A 1AA" {...addressForm.register('postcode', { required: 'Required', minLength: { value: 3, message: 'Required' } })} />
                        {addressForm.formState.errors.postcode && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.postcode.message)}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-1">Address Line 1</label>
                        <Input placeholder="House number and street name" {...addressForm.register('line1', { required: 'Required' })} />
                        {addressForm.formState.errors.line1 && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.line1.message)}</p>}
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-1">Address Line 2 (optional)</label>
                        <Input placeholder="Apartment, flat, unit, etc." {...addressForm.register('line2')} />
                      </div>
                      <div>
                        <label className="text-sm font-semibold block mb-1">City</label>
                        <Input {...addressForm.register('city', { required: 'Required' })} />
                        {addressForm.formState.errors.city && <p className="text-xs text-destructive mt-1">{String(addressForm.formState.errors.city.message)}</p>}
                      </div>

                      {/* Delivery Method */}
                      <div className="pt-2 border-t border-border">
                        <h3 className="font-semibold mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery Speed</h3>
                        <div className="space-y-3">
                          <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <div className="flex items-center gap-3">
                              <input type="radio" value="standard" className="text-primary w-4 h-4" {...addressForm.register('deliveryMethod')} />
                              <div>
                                <p className="font-medium">Standard Delivery</p>
                                <p className="text-sm text-muted-foreground">2–3 business days</p>
                              </div>
                            </div>
                            <span className="font-bold text-sm">{subtotal >= 5500 ? <span className="text-emerald-600">FREE</span> : '£3.99'}</span>
                          </label>
                          <label className="flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-colors hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <div className="flex items-center gap-3">
                              <input type="radio" value="nextday" className="text-primary w-4 h-4" {...addressForm.register('deliveryMethod')} />
                              <div>
                                <p className="font-medium">Next Day Delivery</p>
                                <p className="text-sm text-muted-foreground">Order before 2PM</p>
                              </div>
                            </div>
                            <span className="font-bold text-sm">£5.99</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" size="lg" disabled={syncCart.isPending || startCheckout.isPending || createPaymentIntent.isPending || confirmInStore.isPending}>
                      {(syncCart.isPending || startCheckout.isPending || createPaymentIntent.isPending || confirmInStore.isPending)
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                        : isCollect && paymentMode === 'in_store'
                          ? <>Confirm Order — Pay at Store <ChevronRight className="w-4 h-4 ml-1" /></>
                          : <>Continue to Payment <ChevronRight className="w-4 h-4 ml-1" /></>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            )}
          </Card>

          {/* Step 3: Payment */}
          <Card className={step < 3 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 rounded-t-xl">
              <StepBadge n={3} complete={false} active={step === 3} />
              <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-muted-foreground" /> Payment</CardTitle>
            </CardHeader>
            {step === 3 && (
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" /> All transactions are secure and encrypted.
                </p>
                {checkoutData && stripePromise ? (
                  <Elements stripe={stripePromise} options={{ clientSecret: checkoutData.clientSecret, appearance: { theme: 'stripe' } }}>
                    <StripePaymentForm
                      clientSecret={checkoutData.clientSecret}
                      orderId={checkoutData.orderId}
                      shippingAddress={{
                        firstName: (addressData as any)?.firstName ?? '',
                        lastName: (addressData as any)?.lastName ?? '',
                        line1: isCollect ? STORE_ADDRESS.line1 : ((addressData as any)?.line1 ?? ''),
                        line2: isCollect ? undefined : (addressData as any)?.line2,
                        city: isCollect ? STORE_ADDRESS.city : ((addressData as any)?.city ?? ''),
                        postcode: isCollect ? STORE_ADDRESS.postcode : ((addressData as any)?.postcode ?? ''),
                        countryCode: 'GB',
                        phone: (addressData as any)?.phone ?? '',
                        _deliveryMethod: isCollect ? 'click_and_collect' : ((addressData as any)?.deliveryMethod ?? 'standard'),
                      } as any}
                      onSuccess={handlePaymentSuccess}
                      onError={(msg) => setStepError(msg)}
                    />
                  </Elements>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                    <p>Loading payment...</p>
                  </div>
                )}
                {stepError && (
                  <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 mt-3">{stepError}</div>
                )}
                <div className="pt-2">
                  <Button variant="ghost" onClick={() => { setStep(2); setCheckoutData(null); setStepError(''); }}>Back</Button>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-96 flex-shrink-0">
          <Card className="sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-bold border-b border-border pb-4">Order Summary</h2>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3 items-center">
                    <div className="w-14 h-14 bg-muted rounded-lg flex-shrink-0 overflow-hidden border border-border relative">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">🥬</div>
                      )}
                      <span className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.variantName}</p>
                    </div>
                    <span className="font-semibold text-sm flex-shrink-0">{formatGBP(item.unitPriceMinor * item.quantity)}</span>
                  </div>
                ))}
              </div>

              {/* Promo code input */}
              <div className="pt-2 border-t border-border space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5"><Tag className="w-3 h-3" /> Promo Code</p>
                {promoResult?.valid ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-700">{promoResult.code}</p>
                      <p className="text-xs text-emerald-600">{promoResult.message}</p>
                    </div>
                    <button onClick={handleRemovePromo} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={promoInput}
                      onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleApplyPromo()}
                      placeholder="Enter promo code"
                      className="flex-1 min-w-0 border rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                      maxLength={20}
                      disabled={promoValidating}
                    />
                    <Button size="sm" variant="outline" onClick={handleApplyPromo} disabled={promoValidating || !promoInput.trim()}>
                      {promoValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                    </Button>
                  </div>
                )}
                {promoError && <p className="text-xs text-destructive">{promoError}</p>}
              </div>

              <div className="space-y-2 text-sm pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span>{formatGBP(subtotal)}</span>
                </div>
                {promoResult?.valid && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Promo ({promoResult.code})</span>
                    <span>-{formatGBP(promoResult.discountAmountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{deliveryFeeLabel}</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>{deliveryFee === 0 ? 'FREE' : formatGBP(deliveryFee)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-bold">{formatGBP(total)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Lock className="w-3 h-3" /> Secured by 256-bit SSL encryption
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
