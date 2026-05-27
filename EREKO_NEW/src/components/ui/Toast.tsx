"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationStore } from "@/store/notifications";
import { Button } from "./Button";

export function ToastContainer() {
  const { toasts, removeToast } = useNotificationStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none select-none">
      {toasts.map((toast) => {
        const Icon = {
          success: CheckCircle2,
          error: AlertCircle,
          info: Info,
          warning: AlertTriangle,
        }[toast.type];

        return (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-start gap-3 p-4 bg-card text-card-foreground border rounded-xl shadow-lg pointer-events-auto transform transition-all duration-300 animate-in slide-in-from-bottom-5 duration-200 select-text",
              toast.type === "success" && "border-emerald-500/20 bg-emerald-50/90 dark:bg-emerald-950/20",
              toast.type === "error" && "border-destructive/20 bg-destructive/5 dark:bg-destructive/10",
              toast.type === "info" && "border-primary/20 bg-primary/5",
              toast.type === "warning" && "border-amber-500/20 bg-amber-50/90 dark:bg-amber-950/20"
            )}
          >
            {/* Type Icon */}
            <div
              className={cn(
                "mt-0.5 shrink-0",
                toast.type === "success" && "text-emerald-600 dark:text-emerald-400",
                toast.type === "error" && "text-destructive",
                toast.type === "info" && "text-primary",
                toast.type === "warning" && "text-amber-600 dark:text-amber-400"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-sm font-bold leading-none text-foreground">
                {toast.title}
              </span>
              <span className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                {toast.message}
              </span>
            </div>

            {/* Dismiss Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeToast(toast.id)}
              className="rounded-full h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
