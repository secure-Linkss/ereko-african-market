'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Mail, Phone, MapPin, Clock, CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { motion, type Variants } from 'framer-motion';

const contactSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(3, 'Subject is required').max(200),
  message: z.string().min(10, 'Please enter at least 10 characters').max(2000),
});
type ContactForm = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  async function onSubmit(data: ContactForm) {
    setError('');
    try {
      await apiClient.post('/api/v1/contact', data);
      setSubmitted(true);
      reset();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to send message. Please try again.');
    }
  }

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const slideRight: Variants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const slideLeft: Variants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } }
  };

  return (
    <main className="flex-1 bg-background overflow-hidden">

      {/* Hero */}
      <section className="relative bg-black text-white py-24 md:py-32 px-4 overflow-hidden">
        <motion.div 
           className="absolute inset-0 opacity-30 pointer-events-none bg-cover bg-center"
           initial={{ scale: 1.05 }}
           animate={{ scale: 1 }}
           transition={{ duration: 1.5, ease: "easeOut" }}
           style={{ backgroundImage: 'url(/generated_images/store_front_edited.png)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-black/40 pointer-events-none" />
        
        <motion.div 
          className="relative z-10 max-w-4xl mx-auto text-center space-y-6"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide">
            <MessageSquare className="w-4 h-4 text-primary" /> Get in Touch
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-xl">We&apos;re Here to <span className="text-primary">Help</span></h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Have a question about your order, a product, or just want to say hello? Our team responds within 24 hours.
          </p>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-20 grid grid-cols-1 lg:grid-cols-3 gap-12 xl:gap-16">

        {/* Contact Info */}
        <motion.div 
          className="space-y-10"
          initial="hidden"
          animate="visible"
          variants={slideRight}
        >
          <div>
            <h2 className="text-3xl font-bold mb-8 tracking-tight">Contact Details</h2>
            <div className="space-y-6">
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                  <MapPin className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">Our Store</p>
                  <p className="text-muted-foreground leading-relaxed">5 Broadway, Barking<br />London, IG11 7LS<br />United Kingdom</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                  <Mail className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">Email</p>
                  <a href="mailto:hello@ereko.co.uk" className="text-primary font-medium hover:underline text-lg">hello@ereko.co.uk</a>
                  <p className="text-sm text-muted-foreground mt-1">Response within 24 hours</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                  <Phone className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">Phone</p>
                  <a href="tel:02036337503" className="text-primary font-medium hover:underline text-lg">020 3633 7503</a>
                  <p className="text-sm text-muted-foreground mt-1">Mon–Sat, 9am–6pm</p>
                </div>
              </div>
              
              <div className="flex items-start gap-5 group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary transition-colors">
                  <Clock className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-lg mb-1">Opening Hours</p>
                  <p className="text-muted-foreground leading-relaxed">
                    Mon – Fri: 9:00am – 6:00pm<br />
                    Saturday: 9:00am – 6:00pm<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20 shadow-none">
            <CardContent className="p-6 space-y-3">
              <p className="font-bold text-lg flex items-center gap-2">
                <span className="text-xl">🚀</span> Quick Help
              </p>
              <ul className="text-muted-foreground space-y-2">
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Track your order on the <a href="/account" className="text-primary font-medium hover:underline">Account page</a></li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Check our <a href="/help" className="text-primary font-medium hover:underline">Help Centre</a> for answers</li>
                <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Cargo enquiries: use the <a href="/cargo" className="text-primary font-medium hover:underline">Cargo Portal</a></li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* Contact Form */}
        <motion.div 
          className="lg:col-span-2"
          initial="hidden"
          animate="visible"
          variants={slideLeft}
        >
          {submitted ? (
            <Card className="h-full border-border/50 shadow-2xl flex flex-col items-center justify-center py-20 px-4 text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </motion.div>
              <h3 className="text-3xl font-black mb-4">Message Received!</h3>
              <p className="text-muted-foreground text-lg max-w-md mb-8">
                Thank you for contacting us. Our team will review your message and get back to you within 24 hours.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline" size="lg" className="rounded-full px-8">
                Send another message
              </Button>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-2xl overflow-hidden">
              <CardContent className="p-8 md:p-10">
                <h2 className="text-3xl font-black mb-8 tracking-tight">Send a Message</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Full Name *</label>
                      <Input {...register('name')} placeholder="Amara Osei" className={`h-12 bg-muted/30 border-muted-foreground/20 focus:bg-background ${errors.name ? 'border-destructive' : ''}`} />
                      {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Email Address *</label>
                      <Input {...register('email')} type="email" placeholder="amara@example.com" className={`h-12 bg-muted/30 border-muted-foreground/20 focus:bg-background ${errors.email ? 'border-destructive' : ''}`} />
                      {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Phone Number <span className="lowercase font-normal">(optional)</span></label>
                      <Input {...register('phone')} type="tel" placeholder="+44 7911 123456" className="h-12 bg-muted/30 border-muted-foreground/20 focus:bg-background" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Subject *</label>
                      <Input {...register('subject')} placeholder="Order enquiry, product question..." className={`h-12 bg-muted/30 border-muted-foreground/20 focus:bg-background ${errors.subject ? 'border-destructive' : ''}`} />
                      {errors.subject && <p className="text-xs text-destructive font-medium">{errors.subject.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Message *</label>
                    <textarea
                      {...register('message')}
                      rows={6}
                      placeholder="Tell us how we can help you..."
                      className={`w-full rounded-xl border bg-muted/30 px-4 py-3 text-base ring-offset-background placeholder:text-muted-foreground/60 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none transition-colors ${errors.message ? 'border-destructive' : 'border-muted-foreground/20'}`}
                    />
                    {errors.message && <p className="text-xs text-destructive font-medium">{errors.message.message}</p>}
                  </div>

                  {error && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm font-medium text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border/50">
                    <p className="text-xs text-muted-foreground max-w-xs">
                      By submitting this form you agree to our{' '}
                      <a href="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</a>.
                    </p>
                    <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto h-14 px-8 rounded-full text-base font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105">
                      {isSubmitting ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending...</>
                      ) : (
                        <><Send className="w-5 h-5 mr-2" /> Send Message</>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </section>
    </main>
  );
}
