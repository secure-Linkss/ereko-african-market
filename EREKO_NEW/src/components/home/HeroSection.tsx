"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;

// African kente-inspired SVG pattern (CSS only, inline SVG data-uri)
const PATTERN_SVG = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

const ADINKRA_SVG = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='20' stroke='%23ffffff' stroke-width='1' fill='none' stroke-opacity='0.06'/%3E%3Ccircle cx='40' cy='40' r='10' stroke='%23ffffff' stroke-width='1' fill='none' stroke-opacity='0.04'/%3E%3Cline x1='40' y1='20' x2='40' y2='60' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.04'/%3E%3Cline x1='20' y1='40' x2='60' y2='40' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.04'/%3E%3C/svg%3E")`;

export default function HeroSection() {
  return (
    <section
      className="relative min-h-[92vh] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #E85D04 0%, #9C3506 45%, #1A0A00 100%)",
      }}
      aria-label="Hero section"
    >
      {/* Layered background patterns */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: PATTERN_SVG }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: ADINKRA_SVG, backgroundSize: "80px 80px" }}
        aria-hidden="true"
      />

      {/* Radial glow for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(232,93,4,0.25) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 flex flex-col items-center text-center gap-8">

        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold tracking-wide border border-white/20 bg-white/10 text-white backdrop-blur-sm">
            <span role="img" aria-label="Globe">🌍</span>
            Free UK Delivery Over £55
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-tight tracking-tight"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
        >
          The UK&apos;s Most{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #F4A261, #FFD580)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Authentic
          </span>{" "}
          African Food Market
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="max-w-2xl text-lg md:text-xl text-white/85 leading-relaxed"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: EASE_OUT }}
        >
          From Lagos to London. Premium West African, East African &amp; Pan-African
          groceries, delivered to your door.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 pt-2"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.4, ease: EASE_OUT }}
        >
          <Link
            href="/en-gb/shop"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-base bg-white text-[#9C3506] hover:bg-white/90 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Shop Now
          </Link>
          <Link
            href="/en-gb/recipes"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-bold text-base border-2 border-white text-white hover:bg-white/10 active:scale-[0.98] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Explore Recipes
          </Link>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="pt-8 flex flex-wrap justify-center gap-x-8 gap-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55, ease: EASE_OUT }}
        >
          {[
            { value: "10,000+", label: "Products" },
            { value: "50+", label: "African Brands" },
            { value: "Next-Day", label: "Delivery" },
          ].map((stat, i) => (
            <div key={stat.label} className="flex items-center gap-2 text-white/90">
              {i > 0 && (
                <span className="hidden sm:block w-px h-5 bg-white/30" aria-hidden="true" />
              )}
              <span className="font-extrabold text-lg md:text-xl">{stat.value}</span>
              <span className="text-white/70 text-base">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade for smooth blend into page body */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, transparent, hsl(36 20% 98% / 0.15))",
        }}
        aria-hidden="true"
      />
    </section>
  );
}
