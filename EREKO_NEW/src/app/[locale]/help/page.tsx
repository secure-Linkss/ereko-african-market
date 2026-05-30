'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ChevronDown, HelpCircle, Package, RefreshCw, CreditCard, Truck, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';

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
    <div className="border-b border-border/50 last:border-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left gap-4 hover:text-primary transition-colors outline-none group"
      >
        <span className="font-bold text-base md:text-lg group-hover:translate-x-1 transition-transform">{item.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "anticipate" }}
          className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10"
        >
          <ChevronDown className="w-4 h-4 text-primary" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pb-6 pr-12 text-base text-muted-foreground leading-relaxed">
              {item.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function HelpPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';

  const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
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
          variants={staggerContainer}
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-2.5 rounded-full text-sm font-semibold tracking-wide">
            <HelpCircle className="w-4 h-4 text-primary" /> Help Centre
          </motion.div>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-xl">
            How Can We <span className="text-primary">Help?</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Find answers to the most common questions about shopping with EREKO.
          </motion.p>
        </motion.div>
      </section>

      {/* FAQ Sections */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-20 md:py-32 space-y-16">
        {FAQS.map((section, index) => (
          <motion.div 
            key={section.category}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm border border-primary/10">
                <section.icon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{section.category}</h2>
            </div>
            <div className="bg-background/80 backdrop-blur-sm border border-border/50 rounded-2xl px-6 md:px-8 shadow-sm hover:shadow-md transition-shadow">
              {section.items.map((item) => (
                <FAQItem key={item.q} item={item} />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Still need help */}
        <motion.div 
          className="bg-muted/30 border border-border/50 rounded-3xl p-10 md:p-16 text-center space-y-6 shadow-sm"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
        >
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-3xl font-black tracking-tight">Still need help?</h3>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg mx-auto">
            Can&apos;t find the answer you&apos;re looking for? Our dedicated team is here for you.
          </p>
          <div className="pt-4">
            <Link href={`/${locale}/contact`}>
              <Button size="lg" className="h-14 px-10 text-lg rounded-full shadow-lg hover:scale-105 transition-transform">
                Contact Our Team
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
