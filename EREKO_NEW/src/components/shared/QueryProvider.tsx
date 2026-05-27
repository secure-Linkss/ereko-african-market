"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Create the QueryClient inside a useState hook to avoid sharing client states across different user requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: (failureCount, error: unknown) => {
              const err = error as { response?: { status?: number } };
              // Only retry on network errors or 5xx server failures, do not retry on 4xx authorization errors
              if (err?.response?.status && err.response.status < 500) {
                return false;
              }
              return failureCount < 3;
            },
            staleTime: 1000 * 60 * 5, // Caches data for 5 minutes before treating it as stale
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
