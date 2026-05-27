import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded bg-muted/70 dark:bg-muted/40",
        className
      )}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col h-full gap-3 p-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}
