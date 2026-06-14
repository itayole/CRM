export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  joined: string;
  lastLogin: string | null;
}

export interface Lead {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: "new" | "contacted" | "qualified" | "disqualified" | "converted";
  score: number;
  value: number;
  source: string;
  assignee: string;
  notes?: string;
  activity?: ActivityEntry[];
  clientId?: number | null;
  contactId?: number | null;
  contactName?: string;
}

export interface ActivityEntry {
  type: string;
  text: string;
  time: string;
  user: string;
}

export interface Deal {
  id: number;
  title: string;
  company: string;
  clientId?: number;
  value: number;
  probability: number;
  stage: "lead" | "discovery" | "proposal" | "negotiation" | "closed_won";
  assignee: string;
  closeDate: string;
  health: number;
}

export interface Client {
  id: number;
  name: string;
  industry: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  size: string;
  status: "active" | "prospect";
  since: string;
  assignee: string;
  notes: string;
}

export interface ClientContact {
  id: number;
  clientId: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  main: boolean;
  lastContact?: string;
  deals?: number;
  notes?: string;
}

export interface ProjectPhase {
  id: number;
  name: string;
  status: "pending" | "active" | "done" | "blocked";
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  notes: string;
}

export interface Project {
  id: number;
  clientId: number;
  contactId?: number;
  name: string;
  desc: string;
  status: "planning" | "active" | "paused" | "completed";
  priority: "high" | "medium" | "low";
  budget: number;
  spent: number;
  progress: number;
  startDate: string;
  endDate: string;
  assignee: string;
  tags: string[];
  phases: ProjectPhase[];
}

export interface Contact {
  id: number;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  lastContact: string;
  deals: number;
  notes: string;
}

export interface Task {
  id: number;
  desc: string;
  type: "call" | "email" | "meeting" | "proposal" | "followup" | "other";
  priority: "high" | "medium" | "low";
  date: string;
  time?: string;
  client?: string;
  notes?: string;
  status: "open" | "done";
  assigneeId?: number;
  assignee?: string;
  created?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
  endTime: string;
  type: "meeting" | "call" | "demo" | "task" | "other";
  assignee: string;
  client: string;
  color: string;
  notes: string;
  location: string;
}

export interface Automation {
  id: number;
  name: string;
  trigger: string;
  action: string;
  active: boolean;
  runs: number;
}

export interface Stage {
  id: string;
  label: string;
  color: string;
}
