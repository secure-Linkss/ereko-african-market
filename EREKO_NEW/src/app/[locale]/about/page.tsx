'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Heart, Globe, Leaf, Users, Award, ShoppingBag } from 'lucide-react';
import { motion, type Variants } from 'framer-motion';

export default function AboutPage() {
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
           className="absolute inset-0 opacity-40 pointer-events-none bg-cover bg-center"
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
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight drop-shadow-xl">
            About <span className="text-primary">EREKO</span> Market
          </motion.h1>
          <motion.p variants={fadeUp} className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            The UK&apos;s premier destination for authentic African groceries — bringing the flavours of home to your door.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link href={`/${locale}/shop`}>
              <Button size="lg" className="mt-8 h-14 px-8 text-lg rounded-full shadow-2xl hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5 mr-2" /> Shop Now
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Our Story */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-20 md:py-32 space-y-12">
        <motion.div 
          className="text-center space-y-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Our Story</h2>
          <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
        </motion.div>
        
        <motion.div 
          className="prose prose-lg md:prose-xl max-w-none text-muted-foreground space-y-8 leading-relaxed"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          <motion.p variants={fadeUp}>
            EREKO was born from a simple truth: the African diaspora in the UK deserves access to the same quality, authentic ingredients they grew up with — without the hassle of travelling to distant markets or paying inflated prices.
          </motion.p>
          <motion.p variants={fadeUp}>
            Founded in London, EREKO is more than a grocery store. We are a bridge between communities and their culinary heritage. From West African staples like smoked stockfish, palm oil, and ogbono to East African spices and Pan-African pantry essentials — we source directly from trusted suppliers and deliver freshness to your door.
          </motion.p>
          <motion.p variants={fadeUp}>
            Our name, <strong className="text-foreground">EREKO</strong>, is Yoruba for &ldquo;market&rdquo; — a place where communities gather, trade, and celebrate culture. We carry that spirit into everything we do.
          </motion.p>
        </motion.div>
      </section>

      {/* Values */}
      <section className="bg-muted/20 py-20 md:py-32 px-4 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            className="text-center mb-16 space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Our Values</h2>
            <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
          </motion.div>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {[
              { icon: Heart, title: 'Cultural Pride', desc: 'We celebrate African culinary heritage and make it accessible to everyone in the UK.' },
              { icon: Globe, title: 'Authentic Sourcing', desc: 'Every product is carefully sourced from trusted suppliers across Africa and the diaspora.' },
              { icon: Leaf, title: 'Quality First', desc: 'We never compromise on freshness, quality, or the authenticity of our products.' },
              { icon: Users, title: 'Community Focused', desc: 'We support African-owned businesses and give back to the communities we serve.' },
              { icon: Award, title: 'Customer Trust', desc: 'Transparent pricing, honest descriptions, and a promise to stand behind every product.' },
              { icon: ShoppingBag, title: 'Convenience', desc: 'Free UK delivery over £55 and a seamless online shopping experience built for you.' },
            ].map((v) => (
              <motion.div 
                key={v.title} 
                variants={fadeUp}
                className="bg-background/80 backdrop-blur-sm rounded-2xl p-8 border border-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 space-y-4 group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <v.icon className="w-7 h-7 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="font-bold text-xl tracking-tight">{v.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 md:py-32 px-4">
        <motion.div 
          className="max-w-2xl mx-auto text-center space-y-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
        >
          <h2 className="text-4xl font-black tracking-tight">Ready to Shop?</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">Browse hundreds of authentic African groceries with free delivery on orders over £55.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href={`/${locale}/shop`}>
              <Button size="lg" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto shadow-lg hover:scale-105 transition-transform">Browse the Shop</Button>
            </Link>
            <Link href={`/${locale}/contact`}>
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full w-full sm:w-auto hover:bg-muted">Contact Us</Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
