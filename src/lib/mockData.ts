import type { Lead, Deal, Contact, Client, ClientContact, Project, Task, CalendarEvent, Automation, User, Stage } from "./types";
import { OK, GOLD, WARN, MUTED, NAVY, BLUE, ERR } from "./tokens";

export const initUsers: User[] = [
  { id: 1, name: "איתי",      email: "itayo@shiluv.co.il",  role: "מנהל מערכת",  active: true, joined: "2024-01-01", lastLogin: "2026-05-05" },
  { id: 2, name: "מיכל כהן",  email: "michal@shiluv.co.il", role: "מנהל מכירות", active: true, joined: "2024-01-01", lastLogin: "2026-04-30" },
  { id: 3, name: "ירון לוי",  email: "yaron@shiluv.co.il",  role: "נציג מכירות", active: true, joined: "2024-03-15", lastLogin: "2026-04-29" },
  { id: 4, name: "אייל נחמני", email: "eyal@shiluv.co.il",  role: "נציג מכירות", active: true, joined: "2024-06-01", lastLogin: "2026-04-28" },
];

export const initLeads: Lead[] = [
  { id: 1, name: "אבי לוי",       company: "טק-ויז'ן",  email: "avi@tv.co.il",    phone: "052-1234567", status: "new",          score: 87, value: 45000,  source: "LinkedIn", assignee: "מיכל כהן" },
  { id: 2, name: "שרה מזרחי",     company: "אינוביט",    email: "sara@inv.co.il",  phone: "054-9876543", status: "contacted",    score: 72, value: 28000,  source: "Web Form", assignee: "ירון לוי" },
  { id: 3, name: "דוד ברקוביץ",   company: "FinanceHub", email: "david@fh.co.il",  phone: "050-5554433", status: "qualified",    score: 94, value: 120000, source: "Email",    assignee: "מיכל כהן" },
  { id: 4, name: "רותם שמיר",     company: "StartupX",   email: "rotem@sx.io",     phone: "053-3332211", status: "new",          score: 61, value: 15000,  source: "Meta Ads", assignee: "אייל נחמני" },
  { id: 5, name: "נועה פרץ",      company: "MediCore",   email: "noa@mc.co.il",    phone: "058-7778899", status: "disqualified", score: 35, value: 8000,   source: "WhatsApp", assignee: "ירון לוי" },
  { id: 6, name: "גיל אבן",       company: "AutoTech",   email: "gil@at.co.il",    phone: "052-6665544", status: "contacted",    score: 79, value: 67000,  source: "LinkedIn", assignee: "אייל נחמני" },
];

export const initDeals: Deal[] = [
  { id: 1, title: "חבילת ארגוני",     company: "טק-ויז'ן",  value: 120000, probability: 75, stage: "proposal",     assignee: "מיכל כהן",   closeDate: "2026-05-30", health: 85 },
  { id: 2, title: "SaaS שנתי",        company: "FinanceHub", value: 84000,  probability: 90, stage: "negotiation",  assignee: "ירון לוי",   closeDate: "2026-05-15", health: 92 },
  { id: 3, title: "פיילוט SMB",       company: "StartupX",   value: 18000,  probability: 40, stage: "discovery",   assignee: "אייל נחמני", closeDate: "2026-06-10", health: 55 },
  { id: 4, title: "הסכם תמיכה",       company: "MediCore",   value: 240000, probability: 60, stage: "proposal",    assignee: "מיכל כהן",   closeDate: "2026-06-30", health: 70 },
  { id: 5, title: "Enterprise License", company: "AutoTech", value: 67000,  probability: 85, stage: "closed_won",  assignee: "ירון לוי",   closeDate: "2026-04-25", health: 100 },
  { id: 6, title: "שדרוג Pro",        company: "אינוביט",    value: 36000,  probability: 55, stage: "discovery",   assignee: "אייל נחמני", closeDate: "2026-07-01", health: 63 },
  { id: 7, title: "חוזה Enterprise",  company: "GlobalTech", value: 310000, probability: 30, stage: "lead",        assignee: "מיכל כהן",   closeDate: "2026-08-15", health: 40 },
];

export const initContacts: Contact[] = [
  { id: 1, name: "אבי לוי",     title: "CTO",           company: "טק-ויז'ן",  email: "avi@tv.co.il",    phone: "052-1234567", lastContact: "2026-04-22", deals: 2, notes: "לקוח VIP, מעדיף פגישות בוקר" },
  { id: 2, name: "שרה מזרחי",   title: "VP Marketing",  company: "אינוביט",    email: "sara@inv.co.il",  phone: "054-9876543", lastContact: "2026-04-20", deals: 1, notes: "מתעניינת בפתרון Enterprise" },
  { id: 3, name: "דוד ברקוביץ", title: "CEO",           company: "FinanceHub", email: "david@fh.co.il",  phone: "050-5554433", lastContact: "2026-04-21", deals: 3, notes: "מקבל החלטות מהיר" },
  { id: 4, name: "רותם שמיר",   title: "Head of Sales", company: "StartupX",   email: "rotem@sx.io",     phone: "053-3332211", lastContact: "2026-04-18", deals: 1, notes: "בשלבי תקצוב — לחזור ביוני" },
  { id: 5, name: "גיל אבן",     title: "CFO",           company: "AutoTech",   email: "gil@at.co.il",    phone: "052-6665544", lastContact: "2026-04-23", deals: 1, notes: "מתמקד ב-ROI" },
];

export const initClients: Client[] = [
  { id: 101, name: "טק-ויז'ן",  industry: "טכנולוגיה", email: "info@tv.co.il",      phone: "03-1234567", address: "תל אביב",  website: "tv.co.il",           size: "50-200", status: "active",   since: "2024-01-10", assignee: "מיכל כהן",   notes: "לקוח VIP" },
  { id: 102, name: "FinanceHub", industry: "פיננסים",   email: "contact@fh.co.il",   phone: "03-9876543", address: "רמת גן",   website: "financehub.co.il",   size: "200+",   status: "active",   since: "2024-03-15", assignee: "ירון לוי",   notes: "מגדיל תקציב כל שנה" },
  { id: 103, name: "אינוביט",   industry: "שיווק",     email: "hello@inv.co.il",    phone: "03-5554433", address: "הרצליה",   website: "innovit.co.il",      size: "10-50",  status: "active",   since: "2025-01-20", assignee: "ירון לוי",   notes: "רגיש למחיר" },
  { id: 104, name: "AutoTech",  industry: "רכב",       email: "info@at.co.il",      phone: "03-7778899", address: "חיפה",     website: "autotech.co.il",     size: "50-200", status: "active",   since: "2023-06-01", assignee: "ירון לוי",   notes: "עסקה נסגרה החודש" },
  { id: 105, name: "MediCore",  industry: "בריאות",    email: "info@mc.co.il",      phone: "03-3332211", address: "ירושלים",  website: "medicore.co.il",     size: "200+",   status: "prospect", since: "2025-11-01", assignee: "מיכל כהן",   notes: "בשלבי הצעת מחיר" },
];

export const initClientContacts: ClientContact[] = [
  { id: 1001, clientId: 101, name: "אבי לוי",     role: "CTO",        email: "avi@tv.co.il",    phone: "052-1234567", main: true },
  { id: 1002, clientId: 101, name: "ריקי כהן",    role: "CEO",        email: "riki@tv.co.il",   phone: "054-1111222", main: false },
  { id: 1003, clientId: 102, name: "דוד ברקוביץ", role: "CEO",        email: "david@fh.co.il",  phone: "050-5554433", main: true },
  { id: 1004, clientId: 103, name: "שרה מזרחי",   role: "VP Marketing", email: "sara@inv.co.il", phone: "054-9876543", main: true },
  { id: 1005, clientId: 104, name: "גיל אבן",     role: "CFO",        email: "gil@at.co.il",    phone: "052-6665544", main: true },
  { id: 1006, clientId: 105, name: "נועה פרץ",    role: "VP Operations", email: "noa@mc.co.il", phone: "058-7778899", main: true },
];

export const initProjects: Project[] = [
  {
    id: 1, clientId: 101, contactId: 1001, name: "הטמעת CRM",
    desc: "הטמעה מלאה של מערכת SalesFlow בארגון, כולל הדרכות וחיבור לממשקים קיימים",
    status: "active", priority: "high", budget: 80000, spent: 35000, progress: 45,
    startDate: "2026-03-01", endDate: "2026-07-31", assignee: "מיכל כהן", tags: ["CRM", "טכנולוגיה"],
    phases: [
      { id: 1, name: "ניתוח דרישות",       status: "done",    startDate: "2026-03-01", endDate: "2026-03-15", budget: 8000,  spent: 7500,  notes: "הושלם — 3 פגישות, מסמך דרישות מאושר" },
      { id: 2, name: "עיצוב ואדריכלות",    status: "done",    startDate: "2026-03-16", endDate: "2026-04-05", budget: 15000, spent: 14200, notes: "מסמך אדריכלות מאושר על ידי הלקוח" },
      { id: 3, name: "פיתוח ורכיבים",      status: "active",  startDate: "2026-04-06", endDate: "2026-06-15", budget: 40000, spent: 13300, notes: "בעבודה — 60% מהפיצ'רים הושלמו" },
      { id: 4, name: "בדיקות ו-QA",        status: "pending", startDate: "2026-06-16", endDate: "2026-07-10", budget: 10000, spent: 0,     notes: "" },
      { id: 5, name: "השקה והדרכות",       status: "pending", startDate: "2026-07-11", endDate: "2026-07-31", budget: 7000,  spent: 0,     notes: "" },
    ],
  },
  {
    id: 2, clientId: 102, contactId: 1003, name: "אינטגרציה ERP",
    desc: "חיבור מערכת ERP קיימת לממשקי API חיצוניים ולמערכת הנהלת החשבונות",
    status: "planning", priority: "medium", budget: 120000, spent: 0, progress: 10,
    startDate: "2026-05-01", endDate: "2026-10-31", assignee: "ירון לוי", tags: ["ERP", "אינטגרציה"],
    phases: [
      { id: 1, name: "מיפוי תהליכים",          status: "active",  startDate: "2026-05-01", endDate: "2026-05-20", budget: 12000, spent: 0, notes: "מתחיל ב-1 במאי" },
      { id: 2, name: "פיתוח API",               status: "pending", startDate: "2026-05-21", endDate: "2026-07-31", budget: 55000, spent: 0, notes: "" },
      { id: 3, name: "אינטגרציה ובדיקות",       status: "pending", startDate: "2026-08-01", endDate: "2026-09-30", budget: 35000, spent: 0, notes: "" },
      { id: 4, name: "Go-Live",                  status: "pending", startDate: "2026-10-01", endDate: "2026-10-31", budget: 18000, spent: 0, notes: "" },
    ],
  },
  {
    id: 3, clientId: 104, contactId: 1005, name: "אוטומציה שיווקית",
    desc: "פרויקט אוטומציה שיווקית מקיף — email flows, landing pages, CRM sync",
    status: "completed", priority: "low", budget: 45000, spent: 44000, progress: 100,
    startDate: "2026-01-01", endDate: "2026-04-30", assignee: "אייל נחמני", tags: ["שיווק"],
    phases: [
      { id: 1, name: "אפיון ואסטרטגיה",         status: "done", startDate: "2026-01-01", endDate: "2026-01-20", budget: 8000,  spent: 8000,  notes: "הושלם בזמן" },
      { id: 2, name: "בניית תהליכי אוטומציה",   status: "done", startDate: "2026-01-21", endDate: "2026-03-15", budget: 25000, spent: 24500, notes: "12 flows הוקמו" },
      { id: 3, name: "בדיקות ואופטימיזציה",     status: "done", startDate: "2026-03-16", endDate: "2026-04-15", budget: 8000,  spent: 8200,  notes: "חריגה קטנה אושרה" },
      { id: 4, name: "הסגרה ותיעוד",            status: "done", startDate: "2026-04-16", endDate: "2026-04-30", budget: 4000,  spent: 3300,  notes: "מסמך תפעולי נמסר ללקוח" },
    ],
  },
];

export const initTasks: Task[] = [];

export const initCalendarEvents: CalendarEvent[] = [
  { id: 1,  title: "פגישת היכרות — טק-ויז'ן",      date: "2026-05-04", time: "09:00", endTime: "10:00", type: "meeting", assignee: "מיכל כהן",   client: "טק-ויז'ן",  color: "#5B8DEF", notes: "להכין מצגת פתרון",         location: "משרד הלקוח, תל אביב" },
  { id: 2,  title: "שיחת מעקב — FinanceHub",         date: "2026-05-04", time: "14:00", endTime: "14:30", type: "call",    assignee: "ירון לוי",   client: "FinanceHub", color: OK,        notes: "לעדכן על הצעת המחיר",      location: "" },
  { id: 3,  title: "הדגמת מוצר — StartupX",         date: "2026-05-05", time: "11:00", endTime: "12:30", type: "demo",    assignee: "אייל נחמני", client: "StartupX",   color: GOLD,      notes: "דמו של מודול הלידים",      location: "Zoom" },
  { id: 4,  title: "סקירת חוזה — MediCore",          date: "2026-05-06", time: "10:00", endTime: "11:00", type: "meeting", assignee: "מיכל כהן",   client: "MediCore",   color: "#5B8DEF", notes: "",                         location: "משרד Shiluv" },
  { id: 5,  title: "קיקאוף פרויקט CRM",              date: "2026-05-07", time: "09:00", endTime: "11:00", type: "meeting", assignee: "מיכל כהן",   client: "טק-ויז'ן",  color: "#5B8DEF", notes: "כל הצוות נוכח",            location: "חדר ישיבות A" },
  { id: 6,  title: "שיחת מכירה — AutoTech",          date: "2026-05-07", time: "13:00", endTime: "13:30", type: "call",    assignee: "ירון לוי",   client: "AutoTech",   color: OK,        notes: "",                         location: "" },
  { id: 7,  title: "תזכורת: שליחת הצעת מחיר",       date: "2026-05-08", time: "09:00", endTime: "09:30", type: "task",    assignee: "אייל נחמני", client: "אינוביט",    color: WARN,      notes: "לשלוח עד סוף היום",        location: "" },
  { id: 8,  title: "פגישת תכנון רבעון Q3",           date: "2026-05-11", time: "15:00", endTime: "16:30", type: "meeting", assignee: "מיכל כהן",   client: "",           color: "#5B8DEF", notes: "כל הצוות",                 location: "חדר ישיבות B" },
  { id: 9,  title: "הדרכת משתמשים — FinanceHub",     date: "2026-05-12", time: "10:00", endTime: "12:00", type: "demo",    assignee: "ירון לוי",   client: "FinanceHub", color: GOLD,      notes: "5 משתתפים",               location: "Zoom" },
  { id: 10, title: "Review חוזה שנתי",               date: "2026-05-14", time: "11:00", endTime: "12:00", type: "meeting", assignee: "מיכל כהן",   client: "AutoTech",   color: "#5B8DEF", notes: "",                         location: "טלפון" },
  { id: 11, title: "Follow-up — StartupX",            date: "2026-05-15", time: "14:00", endTime: "14:30", type: "call",    assignee: "אייל נחמני", client: "StartupX",   color: OK,        notes: "",                         location: "" },
  { id: 12, title: "הצגת ROI — MediCore",            date: "2026-05-19", time: "10:00", endTime: "11:30", type: "meeting", assignee: "מיכל כהן",   client: "MediCore",   color: "#5B8DEF", notes: "להכין דוח ROI",            location: "משרד הלקוח" },
];

export const initAutos: Automation[] = [
  { id: 1, name: "Follow-up אוטומטי",       trigger: "ליד נוצר",              action: "שלח מייל + צור משימה",       active: true,  runs: 47  },
  { id: 2, name: "התראת עסקה תקועה",        trigger: "ללא שינוי > 7 ימים",    action: "שלח התראה לנציג",            active: true,  runs: 23  },
  { id: 3, name: "הקצאת ליד round-robin",   trigger: "ליד חדש נכנס",          action: "הקצה לנציג הבא",             active: true,  runs: 156 },
  { id: 4, name: "עדכון עם הצעה",           trigger: "הצעת מחיר נשלחה",       action: "עדכן שלב ל-Proposal",        active: false, runs: 0   },
  { id: 5, name: "סיכום פגישה AI",          trigger: "פגישה הסתיימה",          action: "AI: סכם ושלח לנציג",         active: true,  runs: 12  },
];

export const STAGES: Stage[] = [
  { id: "lead",        label: "ליד חדש",      color: "#7B8FA6" },
  { id: "discovery",   label: "גילוי צרכים",  color: "#5B8DEF" },
  { id: "proposal",    label: "הצעת מחיר",    color: GOLD },
  { id: "negotiation", label: "משא ומתן",     color: "#E0703A" },
  { id: "closed_won",  label: "נסגר ✓",       color: OK },
];

export const LEAD_STATUS: Record<string, { label: string; color: string }> = {
  new:          { label: "חדש",   color: "#5B8DEF" },
  contacted:    { label: "פנייה", color: WARN },
  qualified:    { label: "מוסמך", color: OK },
  disqualified: { label: "נפסל",  color: ERR },
};

export const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  meeting: { label: "פגישה",  color: "#5B8DEF" },
  call:    { label: "שיחה",   color: OK },
  demo:    { label: "דמו",    color: GOLD },
  task:    { label: "משימה",  color: WARN },
  other:   { label: "אחר",    color: MUTED },
};

export const REV_DATA = [
  { month: "נוב׳", actual: 310000, forecast: 320000 },
  { month: "דצמ׳", actual: 285000, forecast: 300000 },
  { month: "ינו׳", actual: 420000, forecast: 400000 },
  { month: "פבר׳", actual: 390000, forecast: 410000 },
  { month: "מרץ",  actual: 465000, forecast: 450000 },
  { month: "אפר׳", actual: null,   forecast: 520000 },
];

export const FUNNEL = [
  { name: "לידים",    value: 248, fill: "#5B8DEF" },
  { name: "מוסמכים", value: 142, fill: GOLD },
  { name: "הצעות",   value: 67,  fill: "#E0703A" },
  { name: "סגורות",  value: 31,  fill: OK },
];

export const ACTS = [
  { id: 1, type: "email", text: "נשלח מייל ל-דוד ברקוביץ",         time: "לפני 20 דק׳",  user: "מיכל כהן" },
  { id: 2, type: "call",  text: "שיחה עם אבי לוי — 18 דקות",      time: "לפני שעה",     user: "ירון לוי" },
  { id: 3, type: "deal",  text: "עסקת AutoTech נסגרה בהצלחה",      time: "לפני 2 שעות",  user: "ירון לוי" },
  { id: 4, type: "note",  text: "הערה לעסקת FinanceHub",            time: "לפני 3 שעות",  user: "מיכל כהן" },
  { id: 5, type: "lead",  text: "ליד חדש נכנס — GlobalTech",        time: "לפני 4 שעות",  user: "מערכת" },
];

export const HE_MONTHS    = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
export const HE_DAYS      = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];
export const HE_DAYS_FULL = ["ראשון","שני","שלישי","רביעי","חמישי","שישי","שבת"];

export const CRM_FIELDS_MAP = ["name","email","phone","source","assignee","notes","value","status"];

export const TEAM_PERF = [
  { name: "מיכל כהן",  deals: 12, revenue: 340000, wr: 68, colorIdx: 0 },
  { name: "ירון לוי",  deals: 9,  revenue: 215000, wr: 72, colorIdx: 1 },
  { name: "אייל נחמני", deals: 7, revenue: 180000, wr: 55, colorIdx: 2 },
];

export const TEAM_COLORS = [NAVY, BLUE, "#2563EB"];

export const INTEGRATION_SOURCES = [
  { id: "website",   label: "אתר אינטרנט",        icon: "🌐", color: "#185FA5", colorBg: "#E6F1FB", method: "Webhook",     status: "active",   today: 4, total: 127, lastLead: "לפני 12 דק׳", inFields: ["full_name","email","phone","message","utm_source"], mapping: { full_name: "name", email: "email", phone: "phone", message: "notes", utm_source: "source" }, webhookUrl: "https://api.salesflow.co.il/v1/leads?source=website&key=sf_live_***" },
  { id: "facebook",  label: "פייסבוק Lead Ads",   icon: "📘", color: "#3b5998", colorBg: "#eef0f8", method: "API Polling", status: "active",   today: 7, total: 284, lastLead: "לפני 3 דק׳",  inFields: ["full_name","email","phone_number","campaign_name","ad_id"], mapping: { full_name: "name", email: "email", phone_number: "phone", campaign_name: "source", ad_id: "notes" }, pollInterval: "כל שעה", accessToken: "" },
  { id: "google",    label: "Google Ads",          icon: "G",  color: "#c0392b", colorBg: "#fde8e7", method: "API Polling", status: "active",   today: 2, total: 98,  lastLead: "לפני שעה",     inFields: ["Name","Email","Phone","Campaign","Keyword"], mapping: { Name: "name", Email: "email", Phone: "phone", Campaign: "source", Keyword: "notes" }, pollInterval: "כל שעה", customerId: "" },
  { id: "whatsapp",  label: "WhatsApp Business",  icon: "💬", color: "#1A7A4A", colorBg: "#E6F4EE", method: "Webhook",     status: "inactive", today: 0, total: 31,  lastLead: "אתמול",         inFields: ["contact_name","wa_id","message_body"], mapping: { contact_name: "name", wa_id: "phone", message_body: "notes" }, webhookUrl: "https://api.salesflow.co.il/v1/leads?source=whatsapp&key=sf_live_***" },
];
