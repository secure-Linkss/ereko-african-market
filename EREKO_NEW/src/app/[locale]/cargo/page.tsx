"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Ship, Plane, Package, Search, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cargoInquirySchema, type CargoInquiryFormData } from '@/lib/validation/schemas';
import { useParams } from 'next/navigation';
import { useCreateCargoInquiry, useTrackConsignment } from '@/services/cargo';
import { motion, useScroll, useTransform } from 'framer-motion';

export default function CargoPortalPage() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);
  const [inquiryError, setInquiryError] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CargoInquiryFormData>({
    resolver: zodResolver(cargoInquirySchema),
    defaultValues: { urgency: 'standard' }
  });

  const inquiryMutation = useCreateCargoInquiry();
  const { data: trackingData, isLoading: trackingLoading, isError: trackingError } = useTrackConsignment(trackingNumber, trackingEnabled);

  const handleTrack = () => {
    if (trackingNumber.trim().length > 3) {
      setTrackingEnabled(true);
    }
  };

  async function onSubmit(data: CargoInquiryFormData) {
    setInquiryError('');
    try {
      await inquiryMutation.mutateAsync(data);
      setInquirySent(true);
      reset();
    } catch (err: any) {
      setInquiryError(err?.response?.data?.detail ?? err?.message ?? 'Failed to submit. Please try again.');
    }
  }

  const fadeUp: any = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <main className="flex-1 w-full bg-muted/20 overflow-hidden">
        
        {/* Hero */}
        <section className="relative bg-black text-white py-24 px-4 md:px-8 overflow-hidden">
            {/* Background Image Animation */}
            <motion.div 
               className="absolute inset-0 opacity-70 pointer-events-none bg-contain bg-no-repeat bg-center md:bg-right"
               initial={{ opacity: 0.5 }}
               animate={{ opacity: 0.8 }}
               transition={{ duration: 4, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
               style={{ backgroundImage: 'url(/generated_images/cargo_services_final.png)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/80 to-transparent pointer-events-none" />
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center relative z-10">
                <motion.div 
                   className="space-y-6"
                   initial="hidden"
                   animate="visible"
                   variants={{
                     hidden: { opacity: 0 },
                     visible: { opacity: 1, transition: { staggerChildren: 0.2 } }
                   }}
                >
                    <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                        Ereko Cargo <span className="text-accent">Express</span>
                    </motion.h1>
                    <motion.p variants={fadeUp} className="text-lg md:text-xl opacity-90 leading-relaxed font-medium">
                        Reliable, fast, and secure freight forwarding between the UK and West Africa. We handle personal effects, commercial goods, and excess baggage.
                    </motion.p>
                    <motion.div variants={fadeUp} className="flex gap-4 pt-4">
                        <div className="flex items-center gap-2 bg-primary-foreground/10 px-5 py-3 rounded-xl backdrop-blur-sm shadow-sm border border-primary-foreground/10">
                            <Ship className="w-6 h-6 text-accent" /> <span className="font-semibold text-sm tracking-wide uppercase">Sea Freight</span>
                        </div>
                         <div className="flex items-center gap-2 bg-primary-foreground/10 px-5 py-3 rounded-xl backdrop-blur-sm shadow-sm border border-primary-foreground/10">
                            <Plane className="w-6 h-6 text-accent" /> <span className="font-semibold text-sm tracking-wide uppercase">Air Freight</span>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Tracker Widget */}
                <motion.div
                   initial={{ opacity: 0, x: 30 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                >
                <Card className="bg-background text-foreground shadow-2xl border-0 overflow-hidden ring-1 ring-border/50">
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
                        
                        {trackingEnabled && !trackingLoading && trackingData && (
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
                </motion.div>
            </div>
        </section>

        {/* Inquiry Form */}
        <motion.section 
           className="max-w-4xl mx-auto py-16 px-4 md:px-8"
           initial="hidden"
           whileInView="visible"
           viewport={{ once: true, margin: "-100px" }}
           variants={fadeUp}
        >
            <div className="text-center mb-10 space-y-4">
                <h2 className="text-3xl font-bold">Request a Quote</h2>
                <p className="text-muted-foreground text-lg">Fill out the form below and our cargo experts will provide a customized shipping quote.</p>
            </div>

            <Card className="shadow-2xl border-0 ring-1 ring-border/50 bg-background/50 backdrop-blur-md">
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

                        {inquiryError && (
                          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">{inquiryError}</div>
                        )}
                        {inquirySent && (
                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                            Inquiry received! A representative will contact you within 24 hours with a quote.
                          </div>
                        )}
                        <div className="pt-6 flex justify-end">
                            <Button type="submit" size="lg" className="w-full md:w-auto px-12 text-lg h-14" disabled={inquiryMutation.isPending || inquirySent}>
                              {inquiryMutation.isPending ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</> : <>Get Quote <ChevronRight className="w-5 h-5 ml-2" /></>}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.section>

    </main>
  );
}
