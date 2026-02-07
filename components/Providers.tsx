"use client";

import { SessionProvider } from "next-auth/react";
import OfflineIndicator from "./OfflineIndicator";
import CacheManager from "./CacheManager";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OfflineIndicator />
      <CacheManager />
      {children}
    </SessionProvider>
  );
}
