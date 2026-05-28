'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, HelpCircle, Package, RefreshCw, CreditCard, Truck, User, MessageSquare } from 'lucide-react';

interface FAQ { q: string; a: string; }

const FAQS: { category: string; icon: any; items: FAQ[] }[] = [
  {
    category: 'Orders & Delivery',
    icon: Truck,
    items: [
      { q: 'How long does delivery take?', a: 'Standard delivery takes 3–5 business days. Express delivery (where available) is 1–2 business days. Same-day delivery is available in selected London postcodes.' },
      { q: 'Do you offer free delivery?', a: 'Yes! Orders over £55 qualify for free standard delivery anywhere in the UK mainland. Orders under £55 have a flat £3.99 delivery charge.' },
      { q: 'Can I track my order?', a: 'Absolutely. Once your order ships, you\'ll receive a tracking number by email. You can also view your order status on your Account page.' },
      { q: 'Do you deliver outside the UK?', a: 'Currently we deliver to UK mainland addresses only. For international shipping of non-food items, check our Cargo service.' },
    ],
  },
  {
    category: 'Returns & Refunds',
    icon: RefreshCw,
    items: [
      { q: 'What is your returns policy?', a: 'We accept returns within 14 days of delivery for non-perishable items in their original, unopened condition. Fresh and frozen products cannot be returned unless damaged or incorrect.' },
      { q: 'My order arrived damaged — what do I do?', a: 'We\'re sorry to hear that! Please take a photo of the damaged item and contact us within 48 hours of delivery at hello@ereko.co.uk. We\'ll arrange a replacement or refund immediately.' },
      { q: 'How long do refunds take?', a: 'Approved refunds are processed within 3–5 business days back to your original payment method.' },
    ],
  },
  {
    category: 'Products & Stock',
    icon: Package,
    items: [
      { q: 'Are your products genuinely authentic?', a: 'Yes. Every product on EREKO is sourced directly from trusted suppliers in Africa and the diaspora. We verify origin, quality, and food safety compliance before listing.' },
      { q: 'What does the storage type mean?', a: '"Ambient" means shelf-stable. "Chilled" requires refrigeration. "Frozen" must be kept frozen. We package temperature-sensitive items with appropriate insulation for delivery.' },
      { q: 'An item I want is out of stock — when will it be back?', a: 'Stock levels vary. You can use the contact form to request a notification when a specific item is restocked.' },
    ],
  },
  {
    category: 'Payments',
    icon: CreditCard,
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard), Apple Pay, Google Pay, Klarna (buy now pay later), and Clearpay.' },
      { q: 'Is my payment information secure?', a: 'Yes. All payments are processed through Stripe, a PCI DSS Level 1 certified payment processor. We never store your card details on our servers.' },
      { q: 'Can I use a promo code?', a: 'Yes! Enter your promo code at checkout. Promo codes are case-insensitive and cannot be combined with other offers.' },
    ],
  },
  {
    category: 'Account',
    icon: User,
    items: [
      { q: 'What is the EREKO Loyalty Programme?', a: 'Earn 1 loyalty point for every £1 spent. Points can be redeemed at checkout (1 point = 1p discount). Members progress through tiers: Member → Family → Elder → Royalty, unlocking exclusive benefits.' },
      { q: 'How do I reset my password?', a: 'Click "Forgot password?" on the login page and enter your email. You\'ll receive a secure reset link within a few minutes.' },
      { q: 'Can I change my delivery address?', a: 'Yes. You can add and manage delivery addresses on your Account page under "Profile".' },
    ],
  },
];

function FAQItem({ item }: { item: FAQ }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-primary transition-colors"
      >
        <span className="font-medium text-sm md:text-base">{item.q}</span>
        {open ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-primary" /> : <ChevronDown className="w-4 h-4 flex-shrink-0 text-muted-foreground" />}
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted-foreground leading-relaxed">
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';

  return (
    <main className="flex-1 bg-background">

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/20 px-4 py-2 rounded-full text-sm font-semibold">
            <HelpCircle className="w-4 h-4" /> Help Centre
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">How Can We Help?</h1>
          <p className="text-lg opacity-90">Find answers to the most common questions about shopping with EREKO.</p>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-12">
        {FAQS.map((section) => (
          <div key={section.category}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <section.icon className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-bold">{section.category}</h2>
            </div>
            <div className="bg-background border border-border rounded-xl px-5">
              {section.items.map((item) => (
                <FAQItem key={item.q} item={item} />
              ))}
            </div>
          </div>
        ))}

        {/* Still need help */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Still need help?</h3>
          <p className="text-muted-foreground">Can&apos;t find the answer you&apos;re looking for? Our team is here for you.</p>
          <Link href={`/${locale}/contact`}>
            <Button size="lg">Contact Our Team</Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
