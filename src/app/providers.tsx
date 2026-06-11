"use client";

import { SessionProvider } from "next-auth/react";
import { AppProvider } from "@/context/AppContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // basePath: next-auth's client (signIn/useSession) doesn't follow Next's
    // basePath on its own — point it at the prefixed auth endpoint.
    <SessionProvider basePath={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/auth`}>
      <AppProvider>{children}</AppProvider>
    </SessionProvider>
  );
}
