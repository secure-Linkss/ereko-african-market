"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Ship, Plane, Package, Search, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cargoInquirySchema, type CargoInquiryFormData } from '@/lib/validation/schemas';
import { useParams } from 'next/navigation';

export default function CargoPortalPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingStatus, setTrackingStatus] = useState<null | 'QUOTED' | 'BOOKED' | 'IN_TRANSIT' | 'DELIVERED'>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<CargoInquiryFormData>({
    resolver: zodResolver(cargoInquirySchema),
    defaultValues: {
        urgency: 'standard'
    }
  });

  const handleTrack = () => {
      if (trackingNumber.length > 5) {
          setTrackingStatus('IN_TRANSIT');
      } else {
          setTrackingStatus(null);
      }
  };

  const onSubmit = (data: CargoInquiryFormData) => {
      console.log('Cargo Inquiry Submitted', data);
      alert('Inquiry received. A representative will contact you with a quote within 24 hours.');
  };

  return (
    <main className="flex-1 w-full bg-muted/20">
        
        {/* Hero */}
        <section className="bg-primary text-primary-foreground py-16 px-4 md:px-8">
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Ereko Cargo Express</h1>
                    <p className="text-lg opacity-90 leading-relaxed">
                        Reliable, fast, and secure freight forwarding between the UK and West Africa. We handle personal effects, commercial goods, and excess baggage.
                    </p>
                    <div className="flex gap-4 pt-2">
                        <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
                            <Ship className="w-5 h-5" /> <span className="font-medium">Sea Freight</span>
                        </div>
                         <div className="flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-lg">
                            <Plane className="w-5 h-5" /> <span className="font-medium">Air Freight</span>
                        </div>
                    </div>
                </div>

                {/* Tracker Widget */}
                <Card className="bg-background text-foreground shadow-2xl border-0">
                    <CardContent className="p-6 md:p-8 space-y-4">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-primary" /> Track Your Consignment</h2>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Enter Tracking ID (e.g. ERK-12345)" 
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                className="h-12 bg-muted/50" 
                            />
                            <Button size="lg" onClick={handleTrack}><Search className="w-5 h-5" /></Button>
                        </div>
                        
                        {trackingStatus === 'IN_TRANSIT' && (
                            <div className="pt-6 mt-6 border-t border-border animate-in fade-in">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-bold text-lg">Shipment ERK-12345</h3>
                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded uppercase">In Transit</span>
                                </div>
                                <p className="text-sm text-muted-foreground mb-6">Lagos, NG ➔ London, UK</p>
                                
                                <div className="relative">
                                    <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-muted"></div>
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex gap-4">
                                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground"><CheckCircle2 className="w-4 h-4" /></div>
                                            <div>
                                                <p className="font-medium text-sm">Dispatched from Lagos Hub</p>
                                                <p className="text-xs text-muted-foreground">Oct 24, 08:00 AM</p>
                                            </div>
                                        </div>
                                         <div className="flex gap-4">
                                            <div className="w-6 h-6 rounded-full bg-amber-500 border-4 border-background"></div>
                                            <div>
                                                <p className="font-medium text-sm text-foreground">Customs Clearance (UK)</p>
                                                <p className="text-xs text-muted-foreground">Estimated: Oct 28</p>
                                            </div>
                                        </div>
                                         <div className="flex gap-4">
                                            <div className="w-6 h-6 rounded-full bg-muted border-4 border-background"></div>
                                            <div>
                                                <p className="font-medium text-sm text-muted-foreground">Out for Delivery</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>

        {/* Inquiry Form */}
        <section className="max-w-4xl mx-auto py-16 px-4 md:px-8">
            <div className="text-center mb-10 space-y-4">
                <h2 className="text-3xl font-bold">Request a Quote</h2>
                <p className="text-muted-foreground">Fill out the form below and our cargo experts will provide a customized shipping quote.</p>
            </div>

            <Card className="shadow-lg border-0">
                <CardContent className="p-6 md:p-10">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                        
                        {/* Sender */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">1. Sender Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Full Name" {...register('senderName')} />
                                <Input label="Email Address" type="email" {...register('senderEmail')} />
                                <Input label="Phone Number" type="tel" {...register('senderPhone')} />
                            </div>
                        </div>

                        {/* Recipient */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">2. Recipient Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Full Name" {...register('recipientName')} />
                                <Input label="Phone Number" type="tel" {...register('recipientPhone')} />
                            </div>
                            <div className="mt-4">
                                <Input label="Full Delivery Address" {...register('recipientAddress')} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <Input label="City" {...register('recipientCity')} />
                                <select {...register('recipientCountry')} className="h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full mt-6">
                                    <option value="">Select Country...</option>
                                    <option value="UK">United Kingdom</option>
                                    <option value="NG">Nigeria</option>
                                    <option value="GH">Ghana</option>
                                </select>
                            </div>
                        </div>

                        {/* Shipment */}
                        <div>
                            <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center gap-2">3. Shipment Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Estimated Weight (kg)" type="number" {...register('weightEstKg', { valueAsNumber: true })} />
                                <Input label="Estimated Volume (cbm) - Optional" type="number" {...register('volumeEstCbm', { valueAsNumber: true })} />
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-1">Item Description</label>
                                <textarea {...register('itemDescription')} className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm" placeholder="Please describe the contents of your shipment..."></textarea>
                            </div>
                            
                            <div className="mt-6">
                                 <label className="block text-sm font-medium mb-3">Service Type</label>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <label className="border border-border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors [&:has(input:checked)]:border-primary [&:has(input:checked)]:bg-primary/5 [&:has(input:checked)]:ring-1 [&:has(input:checked)]:ring-primary">
                                        <div className="flex justify-between items-start mb-2">
                                            <input type="radio" value="standard" {...register('urgency')} className="mt-1" />
                                            <Ship className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <p className="font-bold">Standard Sea</p>
                                        <p className="text-xs text-muted-foreground">4-6 Weeks</p>
                                    </label>
                                    <label className="border border-border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors [&:has(input:checked)]:border-primary [&:has(input:checked)]:bg-primary/5 [&:has(input:checked)]:ring-1 [&:has(input:checked)]:ring-primary">
                                        <div className="flex justify-between items-start mb-2">
                                            <input type="radio" value="express" {...register('urgency')} className="mt-1" />
                                            <Plane className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                        <p className="font-bold">Express Air</p>
                                        <p className="text-xs text-muted-foreground">5-7 Days</p>
                                    </label>
                                    <label className="border border-border rounded-lg p-4 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors [&:has(input:checked)]:border-primary [&:has(input:checked)]:bg-primary/5 [&:has(input:checked)]:ring-1 [&:has(input:checked)]:ring-primary">
                                        <div className="flex justify-between items-start mb-2">
                                            <input type="radio" value="super-express" {...register('urgency')} className="mt-1" />
                                            <Plane className="w-5 h-5 text-primary" />
                                        </div>
                                        <p className="font-bold">Super Express</p>
                                        <p className="text-xs text-muted-foreground">48-72 Hours</p>
                                    </label>
                                 </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end">
                            <Button type="submit" size="lg" className="w-full md:w-auto px-12 text-lg h-14">Get Quote <ChevronRight className="w-5 h-5 ml-2" /></Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>

    </main>
  );
}
