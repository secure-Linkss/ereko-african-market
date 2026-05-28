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

  return (
    <main className="flex-1 bg-background">

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/20 px-4 py-2 rounded-full text-sm font-semibold">
            <MessageSquare className="w-4 h-4" /> Get in Touch
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">We&apos;re Here to Help</h1>
          <p className="text-lg opacity-90 max-w-2xl mx-auto">
            Have a question about your order, a product, or just want to say hello? Our team responds within 24 hours.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* Contact Info */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-6">Contact Details</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Our Store</p>
                  <p className="text-sm text-muted-foreground">5 Broadway, Barking<br />London, IG11 7LS<br />United Kingdom</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <a href="mailto:hello@ereko.co.uk" className="text-sm text-primary hover:underline">hello@ereko.co.uk</a>
                  <p className="text-xs text-muted-foreground mt-0.5">Response within 24 hours</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Phone</p>
                  <a href="tel:02036337503" className="text-sm text-primary hover:underline">020 3633 7503</a>
                  <p className="text-xs text-muted-foreground mt-0.5">Mon–Sat, 9am–6pm</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">Opening Hours</p>
                  <p className="text-sm text-muted-foreground">
                    Mon – Fri: 9:00am – 6:00pm<br />
                    Saturday: 9:00am – 6:00pm<br />
                    Sunday: Closed
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-5 space-y-2">
              <p className="font-bold text-sm">🚀 Quick Help</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Track your order on the <a href="/account" className="text-primary hover:underline">Account page</a></li>
                <li>• Check our <a href="/help" className="text-primary hover:underline">Help Centre</a> for instant answers</li>
                <li>• Cargo enquiries: use the <a href="/cargo" className="text-primary hover:underline">Cargo Portal</a></li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <div className="lg:col-span-2">
          {submitted ? (
            <div className="flex flex-col items-center justify-center h-full py-16 space-y-6 text-center">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Message Received!</h3>
                <p className="text-muted-foreground max-w-md">
                  Thank you for contacting us. Our team will review your message and get back to you within 24 hours.
                </p>
              </div>
              <Button onClick={() => setSubmitted(false)} variant="outline">
                Send another message
              </Button>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Full Name *</label>
                      <Input {...register('name')} placeholder="Amara Osei" className={errors.name ? 'border-destructive' : ''} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email Address *</label>
                      <Input {...register('email')} type="email" placeholder="amara@example.com" className={errors.email ? 'border-destructive' : ''} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Phone Number <span className="text-muted-foreground">(optional)</span></label>
                      <Input {...register('phone')} type="tel" placeholder="+44 7911 123456" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Subject *</label>
                      <Input {...register('subject')} placeholder="Order enquiry, product question..." className={errors.subject ? 'border-destructive' : ''} />
                      {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Message *</label>
                    <textarea
                      {...register('message')}
                      rows={6}
                      placeholder="Tell us how we can help you..."
                      className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 resize-none ${errors.message ? 'border-destructive' : 'border-input'}`}
                    />
                    {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
                  </div>

                  {error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" /> Send Message</>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By submitting this form you agree to our{' '}
                    <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                    We will never share your details with third parties.
                  </p>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </main>
  );
}
