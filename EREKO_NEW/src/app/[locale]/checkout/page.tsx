'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Check, CreditCard, MapPin, Truck, ChevronRight, Loader2, Lock, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useStartCheckout, useCreatePaymentIntent, useConfirmCheckout } from '@/services/checkout';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const contactSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  newsletter: z.boolean().optional(),
});
const addressSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  postcode: z.string().min(3, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  phone: z.string().min(7, 'Required'),
  deliveryMethod: z.enum(['standard', 'nextday']),
});

type ContactForm = z.infer<typeof contactSchema>;
type AddressForm = z.infer<typeof addressSchema>;

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
        await confirmMutation.mutateAsync({
          orderId,
          paymentIntentId: paymentIntent.id,
          billingAddressSameAsShipping: true,
          shippingAddress,
          deliveryMethod: 'standard',
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
  const [checkoutData, setCheckoutData] = useState<{ orderId: string; clientSecret: string; publishableKey: string } | null>(null);
  const [stepError, setStepError] = useState('');
  const [success, setSuccess] = useState(false);

  const { items, getSubtotalMinor, getTotalMinor, shippingMinor, discountMinor, promoCode, clearCart } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();
  const startCheckout = useStartCheckout();
  const createPaymentIntent = useCreatePaymentIntent();

  const subtotal = getSubtotalMinor();
  const activeShipping = subtotal >= 5500 ? 0 : shippingMinor;
  const deliveryFee = addressData?.deliveryMethod === 'nextday' ? 599 : (activeShipping || 399);
  const total = Math.max(0, subtotal - discountMinor) + deliveryFee;
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  const contactForm = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { email: user?.email ?? '', newsletter: false },
  });
  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { deliveryMethod: 'standard', firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' },
  });

  if (items.length === 0 && !success) {
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

  async function onContactSubmit(data: ContactForm) {
    setContactData(data);
    setStep(2);
  }

  async function onAddressSubmit(data: AddressForm) {
    setStepError('');
    setAddressData(data);
    try {
      const cartId = `local-${Date.now()}`;
      const startRes = await startCheckout.mutateAsync({
        postcode: data.postcode,
        cartId,
        email: contactData!.email,
        firstName: data.firstName,
        lastName: data.lastName,
      });
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
      setStepError(err?.response?.data?.detail ?? err?.message ?? 'Failed to initialise checkout. Please try again.');
    }
  }

  function handlePaymentSuccess() {
    clearCart();
    setSuccess(true);
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

          {/* Step 2: Delivery */}
          <Card className={step < 2 ? 'opacity-50 pointer-events-none' : ''}>
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/30 rounded-t-xl">
              <StepBadge n={2} complete={step > 2} active={step === 2} />
              <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-muted-foreground" /> Delivery Details</CardTitle>
              {step > 2 && addressData && (
                <button onClick={() => { setStep(2); setCheckoutData(null); }} className="ml-auto text-xs text-primary hover:underline">Edit</button>
              )}
            </CardHeader>
            {step > 2 && addressData ? (
              <CardContent className="p-4 text-sm text-muted-foreground">
                {addressData.firstName} {addressData.lastName} · {addressData.line1}, {addressData.city}, {addressData.postcode}
              </CardContent>
            ) : step === 2 && (
              <CardContent className="p-6">
                <form onSubmit={addressForm.handleSubmit(onAddressSubmit)} className="space-y-4">
                  {stepError && (
                    <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{stepError}</div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1">First Name</label>
                      <Input {...addressForm.register('firstName')} />
                      {addressForm.formState.errors.firstName && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.firstName.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1">Last Name</label>
                      <Input {...addressForm.register('lastName')} />
                      {addressForm.formState.errors.lastName && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.lastName.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Postcode</label>
                    <Input placeholder="e.g. SW1A 1AA" {...addressForm.register('postcode')} />
                    {addressForm.formState.errors.postcode && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.postcode.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Address Line 1</label>
                    <Input placeholder="House number and street name" {...addressForm.register('line1')} />
                    {addressForm.formState.errors.line1 && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.line1.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-semibold block mb-1">Address Line 2 (optional)</label>
                    <Input placeholder="Apartment, flat, unit, etc." {...addressForm.register('line2')} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold block mb-1">City</label>
                      <Input {...addressForm.register('city')} />
                      {addressForm.formState.errors.city && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold block mb-1">Phone</label>
                      <Input type="tel" placeholder="+44 7700 000000" {...addressForm.register('phone')} />
                      {addressForm.formState.errors.phone && <p className="text-xs text-destructive mt-1">{addressForm.formState.errors.phone.message}</p>}
                    </div>
                  </div>

                  {/* Delivery Method */}
                  <div className="pt-4 border-t border-border">
                    <h3 className="font-semibold mb-3 flex items-center gap-2"><Truck className="w-4 h-4" /> Delivery Method</h3>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <input type="radio" value="standard" className="text-primary w-4 h-4" {...addressForm.register('deliveryMethod')} />
                          <div>
                            <p className="font-medium">Standard Delivery</p>
                            <p className="text-sm text-muted-foreground">2-3 Business Days</p>
                          </div>
                        </div>
                        <span className="font-bold">{subtotal >= 5500 ? 'FREE' : '£3.99'}</span>
                      </label>
                      <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <input type="radio" value="nextday" className="text-primary w-4 h-4" {...addressForm.register('deliveryMethod')} />
                          <div>
                            <p className="font-medium">Next Day Delivery</p>
                            <p className="text-sm text-muted-foreground">Order before 2PM</p>
                          </div>
                        </div>
                        <span className="font-bold">£5.99</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setStep(1)}>Back</Button>
                    <Button type="submit" size="lg" disabled={startCheckout.isPending || createPaymentIntent.isPending}>
                      {(startCheckout.isPending || createPaymentIntent.isPending)
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
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
                        firstName: addressData?.firstName ?? '',
                        lastName: addressData?.lastName ?? '',
                        line1: addressData?.line1 ?? '',
                        line2: addressData?.line2,
                        city: addressData?.city ?? '',
                        postcode: addressData?.postcode ?? '',
                        countryCode: 'GB',
                        phone: addressData?.phone ?? '',
                      }}
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

              <div className="space-y-2 text-sm pt-2 border-t border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({totalItems} items)</span>
                  <span>{formatGBP(subtotal)}</span>
                </div>
                {discountMinor > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Promo {promoCode ? `(${promoCode})` : ''}</span>
                    <span>-{formatGBP(discountMinor)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
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
