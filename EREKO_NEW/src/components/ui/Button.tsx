import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg" | "icon";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
          // Variants
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-[1.01] active:scale-[0.99]",
          variant === "outline" && "border border-border text-foreground hover:bg-muted/30",
          variant === "ghost" && "text-foreground hover:bg-muted/50",
          variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          // Sizes
          size === "sm" && "px-3 py-1.5 text-sm gap-1.5",
          size === "md" && "px-4 py-2 text-base gap-2",
          size === "lg" && "px-6 py-3 text-lg gap-2",
          size === "icon" && "h-10 w-10 p-0 text-lg",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-1.5">
            <svg
              className="animate-spin h-5 w-5 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              role="status"
              aria-label="loading"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {size !== "icon" && <span>Processing...</span>}
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
