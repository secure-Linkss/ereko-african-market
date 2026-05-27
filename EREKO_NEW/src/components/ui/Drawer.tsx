"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  side?: "right" | "left";
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Keyboard navigation & accessibility focus trapping
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      if (drawerRef.current) {
        drawerRef.current.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }

        // Focus trapping
        if (e.key === "Tab" && drawerRef.current) {
          const focusableElements = drawerRef.current.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (e.shiftKey) {
              if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
              }
            } else {
              if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
              }
            }
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "unset";
        if (previousFocus.current) {
          previousFocus.current.focus();
        }
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex bg-background/80 dark:bg-background/90 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "drawer-title" : undefined}
      aria-describedby={description ? "drawer-desc" : undefined}
    >
      <div
        ref={drawerRef}
        tabIndex={-1}
        className={cn(
          "relative flex flex-col h-full w-full max-w-md bg-card text-card-foreground border-l border-border shadow-xl focus:outline-none transition-transform duration-300 ease-out select-none",
          side === "right" && "ml-auto animate-in slide-in-from-right",
          side === "left" && "mr-auto animate-in slide-in-from-left",
          className
        )}
        onClick={(e) => e.stopPropagation()} // Prevent closing drawer on clicking content
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/40">
          <div className="flex flex-col gap-0.5">
            {title && (
              <h2 id="drawer-title" className="text-lg font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p id="drawer-desc" className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 overflow-y-auto select-text">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-border/40 bg-muted/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
