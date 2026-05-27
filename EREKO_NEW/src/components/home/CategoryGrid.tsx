"use client";

import React from "react";
import Link from "next/link";
import { StaggerContainer, StaggerItem } from "@/components/ui/animations";
import { cn } from "@/lib/utils";

// ─── Category data ─────────────────────────────────────────────────────────────
interface CategoryItem {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  /** Background gradient in African palette */
  gradient: string;
  /** Accent colour for the emoji backdrop */
  accent: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    slug: "grains-rice",
    label: "Grains & Rice",
    emoji: "🌾",
    description: "Long-grain, parboiled & ofada rice",
    gradient: "linear-gradient(135deg, #F4A261 0%, #E85D04 100%)",
    accent: "rgba(232,93,4,0.12)",
  },
  {
    slug: "palm-oil",
    label: "Palm Oil",
    emoji: "🛢️",
    description: "Cold-pressed, unrefined & red palm",
    gradient: "linear-gradient(135deg, #F4A261 0%, #C05621 100%)",
    accent: "rgba(244,162,97,0.15)",
  },
  {
    slug: "dried-fish",
    label: "Dried Fish",
    emoji: "🐟",
    description: "Stockfish, crayfish & smoked options",
    gradient: "linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)",
    accent: "rgba(45,106,79,0.12)",
  },
  {
    slug: "spices",
    label: "Spices",
    emoji: "🌶️",
    description: "Suya, ogiri, uda & traditional blends",
    gradient: "linear-gradient(135deg, #9C3506 0%, #1A0A00 100%)",
    accent: "rgba(156,53,6,0.12)",
  },
  {
    slug: "fresh-produce",
    label: "Fresh Produce",
    emoji: "🥬",
    description: "Ugu, uziza leaves, plantain & yam",
    gradient: "linear-gradient(135deg, #52B788 0%, #2D6A4F 100%)",
    accent: "rgba(82,183,136,0.12)",
  },
  {
    slug: "frozen-foods",
    label: "Frozen Foods",
    emoji: "🧊",
    description: "Goat meat, snails, stockfish & more",
    gradient: "linear-gradient(135deg, #4895EF 0%, #1B3A6B 100%)",
    accent: "rgba(72,149,239,0.12)",
  },
];

// ─── Single card ──────────────────────────────────────────────────────────────
interface CategoryCardProps {
  category: CategoryItem;
}

function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/en-gb/shop?category=${category.slug}`}
      className="group block rounded-2xl overflow-hidden border border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]"
      aria-label={`Shop ${category.label}`}
    >
      <div
        className="relative flex flex-col items-center justify-center gap-4 px-5 py-8 transition-transform duration-300 group-hover:-translate-y-1"
        style={{ background: category.gradient }}
      >
        {/* Emoji badge */}
        <div
          className="flex items-center justify-center w-16 h-16 rounded-2xl text-4xl transition-transform duration-300 group-hover:scale-110"
          style={{ background: category.accent, backdropFilter: "blur(4px)" }}
          role="img"
          aria-label={category.label}
        >
          {category.emoji}
        </div>

        {/* Text */}
        <div className="text-center">
          <h3 className="font-bold text-white text-lg leading-tight">
            {category.label}
          </h3>
          <p className="text-white/75 text-sm mt-1 leading-snug">
            {category.description}
          </p>
        </div>

        {/* Hover arrow */}
        <div className="absolute bottom-3 right-4 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
interface CategoryGridProps {
  /** Section heading (optional override) */
  heading?: string;
  className?: string;
}

export function CategoryGrid({
  heading = "Shop by Category",
  className,
}: CategoryGridProps) {
  return (
    <section
      className={cn("w-full max-w-6xl mx-auto px-4 py-16", className)}
      aria-labelledby="category-grid-heading"
    >
      {/* Heading */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2
            id="category-grid-heading"
            className="text-3xl font-extrabold text-foreground"
          >
            {heading}
          </h2>
          <p className="text-muted-foreground mt-1 text-base">
            Explore our full range of authentic African groceries
          </p>
        </div>

        <Link
          href="/en-gb/shop"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-[#E85D04] hover:text-[#C05621] transition-colors focus-visible:outline-none focus-visible:underline"
        >
          View All
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Animated stagger grid */}
      <StaggerContainer
        staggerDelay={0.08}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        {CATEGORIES.map((category) => (
          <StaggerItem key={category.slug}>
            <CategoryCard category={category} />
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Mobile "View All" link */}
      <div className="mt-8 flex justify-center sm:hidden">
        <Link
          href="/en-gb/shop"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E85D04] text-[#E85D04] font-semibold text-sm hover:bg-[#E85D04]/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04]"
        >
          Browse All Categories
        </Link>
      </div>
    </section>
  );
}

export default CategoryGrid;
