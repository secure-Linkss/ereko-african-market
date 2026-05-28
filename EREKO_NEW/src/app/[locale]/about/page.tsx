'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Heart, Globe, Leaf, Users, Award, ShoppingBag } from 'lucide-react';

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en-gb';

  return (
    <main className="flex-1 bg-background">

      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight">
            About EREKO Market
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto leading-relaxed">
            The UK&apos;s premier destination for authentic African groceries — bringing the flavours of home to your door.
          </p>
          <Link href={`/${locale}/shop`}>
            <Button size="lg" variant="secondary" className="mt-4">
              <ShoppingBag className="w-5 h-5 mr-2" /> Shop Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-20 space-y-8">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold">Our Story</h2>
          <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
        </div>
        <div className="prose prose-lg max-w-none text-muted-foreground space-y-6">
          <p>
            EREKO was born from a simple truth: the African diaspora in the UK deserves access to the same quality, authentic ingredients they grew up with — without the hassle of travelling to distant markets or paying inflated prices.
          </p>
          <p>
            Founded in London, EREKO is more than a grocery store. We are a bridge between communities and their culinary heritage. From West African staples like smoked stockfish, palm oil, and ogbono to East African spices and Pan-African pantry essentials — we source directly from trusted suppliers and deliver freshness to your door.
          </p>
          <p>
            Our name, <strong>EREKO</strong>, is Yoruba for &ldquo;market&rdquo; — a place where communities gather, trade, and celebrate culture. We carry that spirit into everything we do.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/30 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl font-bold">Our Values</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Heart, title: 'Cultural Pride', desc: 'We celebrate African culinary heritage and make it accessible to everyone in the UK.' },
              { icon: Globe, title: 'Authentic Sourcing', desc: 'Every product is carefully sourced from trusted suppliers across Africa and the diaspora.' },
              { icon: Leaf, title: 'Quality First', desc: 'We never compromise on freshness, quality, or the authenticity of our products.' },
              { icon: Users, title: 'Community Focused', desc: 'We support African-owned businesses and give back to the communities we serve.' },
              { icon: Award, title: 'Customer Trust', desc: 'Transparent pricing, honest descriptions, and a promise to stand behind every product.' },
              { icon: ShoppingBag, title: 'Convenience', desc: 'Free UK delivery over £55 and a seamless online shopping experience built for you.' },
            ].map((v) => (
              <div key={v.title} className="bg-background rounded-xl p-6 border border-border space-y-3">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <v.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Shop?</h2>
          <p className="text-muted-foreground">Browse hundreds of authentic African groceries with free delivery on orders over £55.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={`/${locale}/shop`}><Button size="lg">Browse the Shop</Button></Link>
            <Link href={`/${locale}/contact`}><Button size="lg" variant="outline">Contact Us</Button></Link>
          </div>
        </div>
      </section>
    </main>
  );
}
