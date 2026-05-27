"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Keyboard navigation & accessibility focus trapping
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      // Focus the modal box or first focusable item
      if (modalRef.current) {
        modalRef.current.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onClose();
        }

        // Focus trapping
        if (e.key === "Tab" && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 dark:bg-background/90 backdrop-blur-sm transition-all duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-desc" : undefined}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          "relative w-full max-w-lg bg-card text-card-foreground border border-border shadow-xl rounded-xl flex flex-col max-h-[90vh] overflow-hidden focus:outline-none animate-in fade-in zoom-in-95 duration-200",
          className
        )}
        onClick={(e) => e.stopPropagation()} // Prevent click propagation to overlay
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border/40">
          <div className="flex flex-col gap-1">
            {title && (
              <h2 id="modal-title" className="text-xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-desc" className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
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
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border/40 bg-muted/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
