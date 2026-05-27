"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Check, CreditCard, MapPin, Truck, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function CheckoutPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [step, setStep] = useState(1);

  return (
    <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8">
      <div className="mb-8">
          <Link href={`/${locale}/cart`} className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block">
              ← Return to Cart
          </Link>
          <h1 className="text-3xl font-bold">Secure Checkout</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Checkout Flow */}
        <div className="flex-1 space-y-6">
            
            {/* Step 1: Contact */}
            <Card className={step < 1 ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader className="flex flex-row items-center gap-4 bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        {step > 1 ? <Check className="w-4 h-4" /> : '1'}
                    </div>
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                </CardHeader>
                {step === 1 && (
                    <CardContent className="p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Input label="Email Address" type="email" placeholder="you@example.com" />
                        <div className="flex items-center gap-2 mt-4">
                            <input type="checkbox" id="newsletter" className="rounded text-primary focus:ring-primary w-4 h-4" />
                            <label htmlFor="newsletter" className="text-sm">Email me with news and offers</label>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <Button size="lg" onClick={() => setStep(2)}>Continue to Delivery <ChevronRight className="w-4 h-4 ml-1" /></Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Step 2: Delivery */}
            <Card className={step < 2 ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader className="flex flex-row items-center gap-4 bg-muted/30">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                        {step > 2 ? <Check className="w-4 h-4" /> : '2'}
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-5 h-5 text-muted-foreground" /> Delivery Details</CardTitle>
                </CardHeader>
                {step === 2 && (
                    <CardContent className="p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="First Name" />
                            <Input label="Last Name" />
                        </div>
                        <Input label="Postcode" placeholder="e.g. SW1A 1AA" />
                        <div className="flex justify-end">
                            <Button variant="secondary" size="sm">Lookup Address</Button>
                        </div>
                        <Input label="Address Line 1" />
                        <Input label="Address Line 2 (Optional)" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="City" />
                            <Input label="Phone Number" type="tel" />
                        </div>

                        <div className="pt-6 border-t border-border">
                            <h3 className="font-semibold mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-muted-foreground" /> Delivery Method</h3>
                            <div className="space-y-3">
                                <label className="flex items-center justify-between p-4 border border-primary ring-1 ring-primary/20 rounded-lg bg-primary/5 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="shipping" className="text-primary focus:ring-primary w-4 h-4" defaultChecked />
                                        <div>
                                            <p className="font-medium text-foreground">Standard Delivery</p>
                                            <p className="text-sm text-muted-foreground">2-3 Business Days</p>
                                        </div>
                                    </div>
                                    <span className="font-bold">£3.99</span>
                                </label>
                                <label className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="shipping" className="text-primary focus:ring-primary w-4 h-4" />
                                        <div>
                                            <p className="font-medium text-foreground">Next Day / Nominated Day</p>
                                            <p className="text-sm text-muted-foreground">Select a specific delivery slot</p>
                                        </div>
                                    </div>
                                    <span className="font-bold">£5.99</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                            <Button size="lg" onClick={() => setStep(3)}>Continue to Payment <ChevronRight className="w-4 h-4 ml-1" /></Button>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Step 3: Payment */}
            <Card className={step < 3 ? 'opacity-50 pointer-events-none' : ''}>
                <CardHeader className="flex flex-row items-center gap-4 bg-muted/30">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/30 text-muted-foreground'}`}>
                        {step > 3 ? <Check className="w-4 h-4" /> : '3'}
                    </div>
                    <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-muted-foreground" /> Payment</CardTitle>
                </CardHeader>
                {step === 3 && (
                    <CardContent className="p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                        <p className="text-sm text-muted-foreground mb-4">All transactions are secure and encrypted.</p>
                        
                        <div className="border border-border rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-border bg-primary/5 flex items-center gap-3">
                                <input type="radio" name="payment" id="pay-card" defaultChecked className="w-4 h-4 text-primary" />
                                <label htmlFor="pay-card" className="font-medium flex-1 cursor-pointer">Credit or Debit Card</label>
                                <div className="flex gap-1">
                                    <div className="w-8 h-5 bg-muted rounded"></div>
                                    <div className="w-8 h-5 bg-muted rounded"></div>
                                    <div className="w-8 h-5 bg-muted rounded"></div>
                                </div>
                            </div>
                            <div className="p-6 bg-background space-y-4">
                                <Input label="Card Number" placeholder="0000 0000 0000 0000" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Expiration Date (MM/YY)" placeholder="MM/YY" />
                                    <Input label="Security Code (CVC)" placeholder="CVC" />
                                </div>
                                <Input label="Name on Card" />
                            </div>
                            
                            <div className="p-4 border-t border-border hover:bg-muted/30 flex items-center gap-3 transition-colors cursor-pointer">
                                <input type="radio" name="payment" id="pay-apple" className="w-4 h-4 text-primary" />
                                <label htmlFor="pay-apple" className="font-medium flex-1 cursor-pointer">Apple Pay</label>
                            </div>
                            <div className="p-4 border-t border-border hover:bg-muted/30 flex items-center gap-3 transition-colors cursor-pointer">
                                <input type="radio" name="payment" id="pay-klarna" className="w-4 h-4 text-primary" />
                                <label htmlFor="pay-klarna" className="font-medium flex-1 cursor-pointer">Klarna (Pay in 3)</label>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-border">
                            <h3 className="font-semibold mb-4">Billing Address</h3>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg bg-muted/10 cursor-pointer">
                                    <input type="radio" name="billing" defaultChecked className="text-primary w-4 h-4" />
                                    <span className="font-medium">Same as delivery address</span>
                                </label>
                                <label className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-muted/10 cursor-pointer">
                                    <input type="radio" name="billing" className="text-primary w-4 h-4" />
                                    <span className="font-medium">Use a different billing address</span>
                                </label>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                            <Button size="lg" onClick={() => setStep(4)}>Review Order <ChevronRight className="w-4 h-4 ml-1" /></Button>
                        </div>
                    </CardContent>
                )}
            </Card>

        </div>

        {/* Order Summary Sidebar */}
        <div className="w-full lg:w-96 flex-shrink-0">
            <Card className="sticky top-8">
                <CardContent className="p-6 space-y-6">
                    <h2 className="text-lg font-bold border-b border-border pb-4">Order Summary</h2>
                    
                    {/* Items miniature */}
                    <div className="space-y-4 max-h-64 overflow-y-auto pr-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex gap-4 items-center">
                                <div className="w-16 h-16 bg-muted rounded border border-border flex-shrink-0 relative">
                                    <img src={`/images/img0${i}.jpg`} alt="Product" className="w-full h-full object-cover rounded" />
                                    <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">2</span>
                                </div>
                                <div className="flex-1 text-sm">
                                    <p className="font-medium line-clamp-1">Authentic Nigerian Product {i}</p>
                                    <p className="text-muted-foreground">500g</p>
                                </div>
                                <span className="font-bold text-sm">£17.00</span>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3 text-sm pt-4 border-t border-border">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">£34.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Delivery</span>
                            <span className="font-medium">£3.99</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Taxes</span>
                            <span className="font-medium">£0.00</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-lg font-bold">Total</span>
                            <span className="text-2xl font-bold">£37.99</span>
                        </div>
                        {step === 4 ? (
                            <Link href={`/${locale}/checkout/success`}>
                                <Button size="lg" className="w-full text-lg h-14 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                                    Pay £37.99 Securely
                                </Button>
                            </Link>
                        ) : (
                            <Button size="lg" className="w-full" disabled>
                                Complete steps to pay
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
