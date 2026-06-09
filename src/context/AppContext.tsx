"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import type { Lead, Automation, User } from "@/lib/types";
import { initLeads, initAutos } from "@/lib/mockData";

interface AppState {
  currentUser: User | null;
  authLoading: boolean;
  impersonating: User | null;
  activeUser: User | null;
  isAdmin: boolean;
  isImpersonating: boolean;
  // Mock-backed data for the pages not yet wired to the live API.
  leads: Lead[];        // consumed by the Integrations demo page
  autos: Automation[];  // consumed by the Automations demo page
  // Actions
  logout: () => void;
  startImpersonate: (user: User) => void;
  stopImpersonate: () => void;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  setAutos: React.Dispatch<React.SetStateAction<Automation[]>>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Real auth: the logged-in user comes from the NextAuth session.
  const { data: session, status } = useSession();
  const authLoading = status === "loading";

  const [impersonating, setImpersonating] = useState<User | null>(null);

  // Only the Integrations and Automations pages still read mock data; every
  // other page is wired to the live API. These two stay until those pages are
  // migrated.
  const [leads, setLeads] = useState<Lead[]>(initLeads);
  const [autos, setAutos] = useState<Automation[]>(initAutos);

  const currentUser: User | null = session?.user
    ? {
        id: Number(session.user.id),
        name: session.user.name ?? session.user.email ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
        active: true,
        joined: "",
        lastLogin: null,
      }
    : null;

  const activeUser = impersonating || currentUser;
  const isAdmin = currentUser?.role === "admin";
  const isImpersonating = !!impersonating;

  const logout = () => {
    setImpersonating(null);
    signOut({ callbackUrl: "/login" });
  };

  const startImpersonate = (user: User) => setImpersonating(user);
  const stopImpersonate = () => setImpersonating(null);

  return (
    <AppContext.Provider value={{
      currentUser,
      authLoading,
      impersonating,
      activeUser,
      isAdmin,
      isImpersonating,
      leads,
      autos,
      logout,
      startImpersonate,
      stopImpersonate,
      setLeads,
      setAutos,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
