"use client";

import React from "react";
import {
  motion,
  useInView,
  type Variants,
  type HTMLMotionProps,
} from "framer-motion";

// ─── Shared config ────────────────────────────────────────────────────────────
const EASE_OUT = [0.25, 0.46, 0.45, 0.94] as const;
const IN_VIEW_OPTIONS = { once: true, margin: "-50px" } as const;

// ─── FadeInUp ─────────────────────────────────────────────────────────────────
interface FadeInUpProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeInUp({
  children,
  delay = 0,
  duration = 0.55,
  className,
}: FadeInUpProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.55,
  className,
}: FadeInProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

// ─── SlideInLeft ──────────────────────────────────────────────────────────────
interface SlideInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  distance?: number;
  className?: string;
}

export function SlideInLeft({
  children,
  delay = 0,
  duration = 0.55,
  distance = 40,
  className,
}: SlideInProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: -distance }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -distance }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export function SlideInRight({
  children,
  delay = 0,
  duration = 0.55,
  distance = 40,
  className,
}: SlideInProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: distance }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: distance }}
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

// ─── ScaleIn ──────────────────────────────────────────────────────────────────
interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
}: ScaleInProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={
        isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }
      }
      transition={{ duration, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerContainer ─────────────────────────────────────────────────────────
const staggerContainerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, IN_VIEW_OPTIONS);

  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.05,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={isInView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerItem ──────────────────────────────────────────────────────────────
const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItemVariants}>
      {children}
    </motion.div>
  );
}

// ─── HoverScale ───────────────────────────────────────────────────────────────
interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function HoverScale({
  children,
  scale = 1.05,
  className,
  onClick,
}: HoverScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── PageTransition ───────────────────────────────────────────────────────────
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
