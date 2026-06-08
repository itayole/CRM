"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useSession, signOut } from "next-auth/react";
import type { Lead, Deal, Contact, Client, ClientContact, Project, Task, CalendarEvent, Automation, User } from "@/lib/types";
import {
  initLeads, initDeals, initContacts, initClients, initClientContacts,
  initProjects, initTasks, initCalendarEvents, initAutos, initUsers,
} from "@/lib/mockData";

interface AppState {
  currentUser: User | null;
  authLoading: boolean;
  impersonating: User | null;
  activeUser: User | null;
  isAdmin: boolean;
  isImpersonating: boolean;
  leads: Lead[];
  deals: Deal[];
  contacts: Contact[];
  clients: Client[];
  clientContacts: ClientContact[];
  projects: Project[];
  tasks: Task[];
  calendarEvents: CalendarEvent[];
  autos: Automation[];
  users: User[];
  // Filtered views
  visibleLeads: Lead[];
  visibleDeals: Deal[];
  visibleClients: Client[];
  visibleTasks: Task[];
  // Actions
  logout: () => void;
  startImpersonate: (user: User) => void;
  stopImpersonate: () => void;
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  setDeals: React.Dispatch<React.SetStateAction<Deal[]>>;
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setClientContacts: React.Dispatch<React.SetStateAction<ClientContact[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  setAutos: React.Dispatch<React.SetStateAction<Automation[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // Real auth: the logged-in user comes from the NextAuth session.
  const { data: session, status } = useSession();
  const authLoading = status === "loading";

  const [impersonating, setImpersonating] = useState<User | null>(null);

  // Business data is still mock-backed (the DB tables other than `users` are
  // empty); these stay until the data layer is wired to the API.
  const [leads, setLeads] = useState<Lead[]>(initLeads);
  const [deals, setDeals] = useState<Deal[]>(initDeals);
  const [contacts, setContacts] = useState<Contact[]>(initContacts);
  const [clients, setClients] = useState<Client[]>(initClients);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>(initClientContacts);
  const [projects, setProjects] = useState<Project[]>(initProjects);
  const [tasks, setTasks] = useState<Task[]>(initTasks);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(initCalendarEvents);
  const [autos, setAutos] = useState<Automation[]>(initAutos);
  const [users, setUsers] = useState<User[]>(initUsers);

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

  const filterByUser = <T extends { assignee?: string }>(items: T[]): T[] => {
    if (!activeUser) return items;
    if (isAdmin && !isImpersonating) return items;
    return items.filter(item => item.assignee === activeUser.name);
  };

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
      deals,
      contacts,
      clients,
      clientContacts,
      projects,
      tasks,
      calendarEvents,
      autos,
      users,
      visibleLeads: filterByUser(leads),
      visibleDeals: filterByUser(deals),
      visibleClients: filterByUser(clients),
      visibleTasks: filterByUser(tasks),
      logout,
      startImpersonate,
      stopImpersonate,
      setLeads,
      setDeals,
      setContacts,
      setClients,
      setClientContacts,
      setProjects,
      setTasks,
      setCalendarEvents,
      setAutos,
      setUsers,
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
