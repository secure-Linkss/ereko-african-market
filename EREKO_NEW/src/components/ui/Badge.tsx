import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "ambient" | "chilled" | "frozen" | "success";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold select-none border border-transparent transition-all",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-secondary text-secondary-foreground",
        variant === "outline" && "border-border text-foreground bg-background/50",
        variant === "destructive" && "bg-destructive text-destructive-foreground",
        variant === "ambient" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50",
        variant === "chilled" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50",
        variant === "frozen" && "bg-sky-200 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300 border-sky-300/50",
        variant === "success" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/50",
        className
      )}
      {...props}
    />
  );
}
