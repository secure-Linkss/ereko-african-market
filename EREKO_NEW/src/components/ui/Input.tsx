import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, helperText, icon, id, ...props }, ref) => {
    const fallbackId = React.useId();
    const generatedId = id || fallbackId;
    const errorId = `${generatedId}-error`;
    const helperId = `${generatedId}-helper`;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={generatedId}
            className="text-sm font-semibold text-foreground select-none"
          >
            {label}
          </label>
        ) }
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3.5 text-muted-foreground pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={type}
            id={generatedId}
            aria-invalid={!!error}
            aria-describedby={
              cn(
                error ? errorId : undefined,
                helperText ? helperId : undefined
              ) || undefined
            }
            className={cn(
              "flex h-11 w-full rounded-lg border border-border bg-background/50 px-3.5 py-2 text-base ring-offset-background transition-all placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:pointer-events-none select-text",
              icon && "pl-10.5",
              error && "border-destructive focus:ring-destructive focus:border-destructive",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm font-medium text-destructive mt-0.5"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p
            id={helperId}
            className="text-xs text-muted-foreground mt-0.5"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
