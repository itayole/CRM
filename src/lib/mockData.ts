import type { Lead, Automation, Stage } from "./types";
import { OK, GOLD, WARN, MUTED, NAVY, BLUE, ERR } from "./tokens";

// NOTE: only initLeads (Integrations page) and initAutos (Automations page) are
// still consumed. The other entities are live via the API; their mock seed
// arrays were removed. The constants below (STAGES/LEAD_STATUS/EVENT_TYPES/
// HE_*/FUNNEL/etc.) are locale + taxonomy data still used across the UI.
export const initLeads: Lead[] = [
  { id: 1, name: "אבי לוי",       company: "טק-ויז'ן",  email: "avi@tv.co.il",    phone: "052-1234567", status: "new",          score: 87, value: 45000,  source: "LinkedIn", assignee: "מיכל כהן" },
  { id: 2, name: "שרה מזרחי",     company: "אינוביט",    email: "sara@inv.co.il",  phone: "054-9876543", status: "contacted",    score: 72, value: 28000,  source: "Web Form", assignee: "ירון לוי" },
  { id: 3, name: "דוד ברקוביץ",   company: "FinanceHub", email: "david@fh.co.il",  phone: "050-5554433", status: "qualified",    score: 94, value: 120000, source: "Email",    assignee: "מיכל כהן" },
  { id: 4, name: "רותם שמיר",     company: "StartupX",   email: "rotem@sx.io",     phone: "053-3332211", status: "new",          score: 61, value: 15000,  source: "Meta Ads", assignee: "אייל נחמני" },
  { id: 5, name: "נועה פרץ",      company: "MediCore",   email: "noa@mc.co.il",    phone: "058-7778899", status: "disqualified", score: 35, value: 8000,   source: "WhatsApp", assignee: "ירון לוי" },
  { id: 6, name: "גיל אבן",       company: "AutoTech",   email: "gil@at.co.il",    phone: "052-6665544", status: "contacted",    score: 79, value: 67000,  source: "LinkedIn", assignee: "אייל נחמני" },
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
  converted:    { label: "הומר לפרויקט", color: NAVY },
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
