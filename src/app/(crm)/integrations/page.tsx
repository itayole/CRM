"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Stat, Btn, Input, Select, Field, FormRow } from "@/components/ui";
import { NAVY, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import { INTEGRATION_SOURCES, CRM_FIELDS_MAP } from "@/lib/mockData";
import type { Lead } from "@/lib/types";

type IntSource = typeof INTEGRATION_SOURCES[number] & { [key: string]: any };

type LogEntry = { time: string; source: string; name: string; email: string; score: number; status: string };

const SOURCE_LABEL: Record<string, string> = { website: "אתר", facebook: "פייסבוק", google: "Google", whatsapp: "WhatsApp" };

const STATUS_BADGE: Record<string, JSX.Element> = {
  ok:  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#EAF3DE", color: "#3B6D11" }}>נכנס</span>,
  dup: <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#FAEEDA", color: "#854F0B" }}>כפיל</span>,
  err: <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#FCEBEB", color: "#A32D2D" }}>שגיאה</span>,
};

const TABS = [
  { id: "sources",  label: "מקורות" },
  { id: "mapping",  label: "מיפוי שדות" },
  { id: "log",      label: "יומן לידים" },
  { id: "webhook",  label: "Webhook / API" },
  { id: "test",     label: "בדיקת חיבור" },
];

export default function IntegrationsPage() {
  const { leads, setLeads } = useApp();
  const [tab, setTab] = useState("sources");
  const [sources, setSources] = useState<IntSource[]>(INTEGRATION_SOURCES as IntSource[]);
  const [selId, setSelId] = useState<string | null>(null);
  const [mappingSource, setMappingSource] = useState("website");
  const [logFilter, setLogFilter] = useState("all");
  const [logStatus, setLogStatus] = useState("all");
  const [testForm, setTestForm] = useState({ name: "ישראל ישראלי בדיקה", email: "test@example.com", phone: "052-0000000", source: "website", notes: "" });
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    { time: "13:42", source: "facebook",  name: "דוד כהן",    email: "david@co.il",        score: 82, status: "ok" },
    { time: "13:38", source: "website",   name: "שרה לוי",    email: "sara@example.com",   score: 74, status: "ok" },
    { time: "13:21", source: "google",    name: "אבי ברק",    email: "avi@test.co.il",     score: 91, status: "ok" },
    { time: "13:05", source: "facebook",  name: "רותם שמיר",  email: "rotem@dup.co.il",    score: 0,  status: "dup" },
    { time: "12:33", source: "whatsapp",  name: "גיל אבן",    email: "—",                  score: 0,  status: "err" },
  ]);

  const sel = sources.find(s => s.id === selId) || null;
  const activeCount = sources.filter(s => s.status === "active").length;
  const todayTotal  = sources.reduce((a, s) => a + s.today, 0);
  const totalAll    = sources.reduce((a, s) => a + s.total, 0);

  const addSimLead = () => {
    const names   = ["יוסי בן דוד", "רחל שפירא", "אמיר עוז", "ליאת גולן", "עמיר ניר"];
    const srcs    = ["website", "facebook", "google", "whatsapp"];
    const statuses = ["ok", "ok", "ok", "dup", "err"];
    const name    = names[Math.floor(Math.random() * names.length)];
    const src     = srcs[Math.floor(Math.random() * srcs.length)];
    const st      = statuses[Math.floor(Math.random() * statuses.length)];
    const score   = st === "ok" ? Math.floor(Math.random() * 40 + 55) : 0;
    const now     = new Date();
    const t       = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
    const newLog: LogEntry = { time: t, source: src, name, email: name.split(" ")[0].toLowerCase() + "@test.co.il", score, status: st };
    setLogs(p => [newLog, ...p]);
    if (st === "ok") {
      setSources(p => p.map(s => s.id === src ? { ...s, today: s.today + 1, total: s.total + 1, lastLead: "עכשיו" } : s));
      setLeads((p: Lead[]) => [{ id: Date.now(), name, company: "—", email: newLog.email, phone: "—", status: "new", score, value: 0, source: src, assignee: "מיכל כהן" } as Lead, ...p]);
    }
  };

  const runTest = () => {
    if (!testForm.name || !testForm.email) { alert("שם ומייל הם שדות חובה"); return; }
    setTestLoading(true); setTestResult(null);
    setTimeout(() => {
      const score    = Math.floor(Math.random() * 35 + 55);
      const id       = "lead_" + Date.now();
      const assignees = ["מיכל כהן", "ירון לוי", "אייל נחמני"];
      const assignee  = assignees[Math.floor(Math.random() * 3)];
      const result    = { status: "created", lead_id: id, ...testForm, ai_score: score, assigned_to: assignee, created_at: new Date().toISOString() };
      setTestResult(result);
      setTestLoading(false);
      setLeads((p: Lead[]) => [{ id: Date.now(), name: testForm.name, company: "—", email: testForm.email, phone: testForm.phone || "—", status: "new", score, value: 0, source: testForm.source, assignee } as Lead, ...p]);
      const now = new Date();
      const t   = now.getHours() + ":" + String(now.getMinutes()).padStart(2, "0");
      setLogs(prev => [{ time: t, source: testForm.source, name: testForm.name, email: testForm.email, score, status: "ok" }, ...prev]);
      setSources(prev => prev.map(s => s.id === testForm.source ? { ...s, today: s.today + 1, total: s.total + 1, lastLead: "עכשיו" } : s));
    }, 800);
  };

  const toggleSource = (id: string) => setSources(p => p.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));
  const filteredLogs = logs.filter(l => (logFilter === "all" || l.source === logFilter) && (logStatus === "all" || l.status === logStatus));
  const mappingSrc = sources.find(s => s.id === mappingSource);

  const tabStyle = (id: string): React.CSSProperties => ({
    padding: "7px 14px", borderRadius: 7, border: `1px solid ${tab === id ? NAVY : BORDER}`,
    background: tab === id ? NAVY : WHITE, color: tab === id ? WHITE : TEXT,
    fontSize: 11, fontWeight: tab === id ? 700 : 500, cursor: "pointer", fontFamily: "inherit",
  });

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🔌 אינטגרציות לידים</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>חיבור מקורות חיצוניים → רשימת הלידים</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Stat label="מקורות פעילים" value={activeCount} color={OK} />
          <Stat label="לידים היום"    value={todayTotal}  color={BLUE} />
          <Stat label="סה״כ"          value={totalAll}    color={NAVY} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>)}
      </div>

      {tab === "sources" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 10, marginBottom: 14 }}>
            {sources.map(s => (
              <div key={s.id} onClick={() => setSelId(selId === s.id ? null : s.id)}
                style={{ background: WHITE, border: `${selId === s.id ? "2px" : "1px"} solid ${selId === s.id ? NAVY : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer" }}
                onMouseEnter={e => { if (selId !== s.id) e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.06)"; }}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: s.colorBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: s.status === "active" ? "#EAF3DE" : SURF, color: s.status === "active" ? OK : MUTED }}>{s.status === "active" ? "פעיל" : "כבוי"}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, marginBottom: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{s.method}</div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: BLUE }}>{s.today}</div><div style={{ fontSize: 9, color: MUTED }}>היום</div></div>
                  <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, fontWeight: 800, color: TEXT }}>{s.total}</div><div style={{ fontSize: 9, color: MUTED }}>סה״כ</div></div>
                  <div style={{ fontSize: 10, color: MUTED, alignSelf: "flex-end" }}>{s.lastLead}</div>
                </div>
              </div>
            ))}
          </div>
          {sel && (
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>הגדרות: {sel.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: MUTED }}>סטטוס:</span>
                  <div onClick={() => toggleSource(sel.id)} style={{ width: 36, height: 20, borderRadius: 10, background: sel.status === "active" ? OK : BORDER, cursor: "pointer", position: "relative" }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: WHITE, position: "absolute", top: 3, left: sel.status === "active" ? 19 : 3, transition: "left 0.2s" }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: sel.status === "active" ? OK : MUTED }}>{sel.status === "active" ? "פעיל" : "כבוי"}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>שיטת קליטה</div><div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{sel.method}</div></div>
                <div>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>שדות נכנסים</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(sel.inFields || []).map((f: string) => <span key={f} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: SURF, color: TEXT, border: `1px solid ${BORDER}` }}>{f}</span>)}
                  </div>
                </div>
              </div>
              {sel.method === "Webhook" && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: MUTED, marginBottom: 5 }}>Webhook URL:</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <input readOnly value={sel.webhookUrl} style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, background: SURF, color: TEXT, fontFamily: "monospace", outline: "none" }} />
                    <Btn onClick={() => navigator.clipboard?.writeText(sel.webhookUrl || "")} variant="secondary" sm>העתק</Btn>
                  </div>
                </div>
              )}
              {sel.method === "API Polling" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>תדירות משיכה</div>
                    <Select value={sel.pollInterval || "כל שעה"} onChange={() => {}} options={["כל 5 דקות", "כל 15 דקות", "כל שעה", "כל 6 שעות"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} /></div>
                  {sel.id === "facebook" && <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Page Access Token</div><Input value={sel.accessToken || ""} onChange={() => {}} placeholder="EAAxxxxx..." style={{ width: "100%" }} /></div>}
                  {sel.id === "google" && <div><div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Customer ID</div><Input value={sel.customerId || ""} onChange={() => {}} placeholder="123-456-7890" style={{ width: "100%" }} /></div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => { setSources(p => p.map(s => s.id === sel.id ? { ...s, status: "active" } : s)); alert("הגדרות נשמרו!"); }}>שמור הגדרות</Btn>
                <Btn onClick={() => setTab("mapping")} variant="secondary">ערוך מיפוי שדות</Btn>
                <Btn onClick={() => setTab("test")} variant="secondary">בדוק חיבור</Btn>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "mapping" && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>מיפוי שדות נכנסים → שדות CRM</div>
            <Select value={mappingSource} onChange={setMappingSource} options={sources.map(s => ({ value: s.id, label: s.label }))} style={{ width: 180 }} />
          </div>
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>שדה מקור ({mappingSrc?.label})</div>
              <div />
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>שדה CRM</div>
            </div>
            {(mappingSrc?.inFields || []).map((f: string) => (
              <div key={f} style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <div style={{ padding: "7px 10px", background: SURF, borderRadius: 7, fontSize: 12, color: TEXT, border: `1px solid ${BORDER}` }}>{f}</div>
                <div style={{ textAlign: "center", color: MUTED, fontSize: 14 }}>→</div>
                <Select value={((mappingSrc?.mapping as unknown) as Record<string, string>)?.[f] || ""} onChange={() => {}} options={[{ value: "", label: "-- לא ממופה --" }, ...CRM_FIELDS_MAP.map(c => ({ value: c, label: c }))]} style={{ width: "100%" }} />
              </div>
            ))}
            <div style={{ marginTop: 8, padding: "10px 12px", background: SURF, borderRadius: 7, fontSize: 11, color: MUTED }}>שדות לא ממופים ישמרו בעמודת "הערות" של הליד.</div>
            <div style={{ marginTop: 12 }}><Btn onClick={() => alert("מיפוי נשמר!")}>שמור מיפוי</Btn></div>
          </div>
        </div>
      )}

      {tab === "log" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <Select value={logFilter} onChange={setLogFilter} options={[{ value: "all", label: "כל המקורות" }, { value: "website", label: "אתר" }, { value: "facebook", label: "פייסבוק" }, { value: "google", label: "Google" }, { value: "whatsapp", label: "WhatsApp" }]} style={{ width: 140 }} />
            <Select value={logStatus} onChange={setLogStatus} options={[{ value: "all", label: "כל הסטטוסים" }, { value: "ok", label: "נכנס בהצלחה" }, { value: "dup", label: "כפיל" }, { value: "err", label: "שגיאה" }]} style={{ width: 140 }} />
            <div style={{ flex: 1 }} />
            <Btn onClick={addSimLead} variant="secondary">+ סימולציית ליד נכנס</Btn>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 60px 70px", gap: 8, padding: "8px 12px", background: SURF, borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: MUTED }}>
              <div>זמן</div><div>מקור</div><div>שם / מייל</div><div>ציון</div><div>סטטוס</div>
            </div>
            {filteredLogs.length === 0 && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>אין רשומות תואמות</div>}
            {filteredLogs.map((l, i) => {
              const sc = l.score >= 80 ? OK : l.score >= 60 ? WARN : MUTED;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 80px 1fr 60px 70px", gap: 8, padding: "9px 12px", borderBottom: `1px solid ${BORDER}`, fontSize: 11, alignItems: "center" }}
                  onMouseEnter={e => (e.currentTarget.style.background = SURF)} onMouseLeave={e => (e.currentTarget.style.background = WHITE)}>
                  <div style={{ color: MUTED }}>{l.time}</div>
                  <div><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#E6F1FB", color: "#185FA5" }}>{SOURCE_LABEL[l.source] || l.source}</span></div>
                  <div><div style={{ fontWeight: 700, color: TEXT }}>{l.name}</div><div style={{ color: MUTED }}>{l.email}</div></div>
                  <div style={{ fontWeight: 700, color: sc }}>{l.score || "—"}</div>
                  <div>{STATUS_BADGE[l.status]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "webhook" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Webhook נכנס — שליחה מהאתר</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>שלח POST לכתובת הבאה מכל טופס:</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 10, color: TEXT, marginBottom: 10, border: `1px solid ${BORDER}`, lineHeight: 1.7, whiteSpace: "pre" }}>{"POST https://api.salesflow.co.il/v1/leads\nAuthorization: Bearer YOUR_API_KEY\nContent-Type: application/json"}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, marginBottom: 6 }}>API Key:</div>
              <div style={{ display: "flex", gap: 6 }}>
                <input readOnly value="sf_live_k7x9m2p4q8r..." style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, background: SURF, fontFamily: "monospace", outline: "none" }} />
                <Btn onClick={() => navigator.clipboard?.writeText("sf_live_k7x9m2p4q8r...")} variant="secondary" sm>העתק</Btn>
              </div>
            </div>
            <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>Payload לדוגמה</div>
              <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 10, color: TEXT, border: `1px solid ${BORDER}`, lineHeight: 1.8, whiteSpace: "pre" }}>{`{\n  "name": "ישראל ישראלי",\n  "email": "user@example.com",\n  "phone": "052-1234567",\n  "source": "website",\n  "notes": "מתעניין בחבילה עסקית"\n}`}</div>
            </div>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>קוד Embed לאתר (HTML)</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 12, color: TEXT, border: `1px solid ${BORDER}`, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{`<form id="sf-form" onsubmit="sfSubmit(event)">\n  <input name="name" placeholder="שם מלא" required />\n  <input name="email" type="email" placeholder="מייל" required />\n  <input name="phone" placeholder="טלפון" />\n  <button type="submit">שלח</button>\n</form>\n<script>\nasync function sfSubmit(e) {\n  e.preventDefault();\n  const data = Object.fromEntries(new FormData(e.target));\n  await fetch("https://api.salesflow.co.il/v1/leads", {\n    method: "POST",\n    headers: { Authorization: "Bearer sf_live_***" },\n    body: JSON.stringify({...data, source: "website"})\n  });\n}\n<\\/script>`}</div>
          </div>
        </div>
      )}

      {tab === "test" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 14 }}>שלח ליד בדיקה — יכנס ישירות לרשימת הלידים</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <Field label="שם:"><Input value={testForm.name} onChange={v => setTestForm(p => ({ ...p, name: v }))} style={{ width: "100%" }} /></Field>
              <Field label="מייל:"><Input value={testForm.email} onChange={v => setTestForm(p => ({ ...p, email: v }))} style={{ width: "100%" }} /></Field>
              <Field label="טלפון:"><Input value={testForm.phone} onChange={v => setTestForm(p => ({ ...p, phone: v }))} style={{ width: "100%" }} /></Field>
              <Field label="מקור:"><Select value={testForm.source} onChange={v => setTestForm(p => ({ ...p, source: v }))} options={sources.map(s => ({ value: s.id, label: s.label }))} style={{ width: "100%" }} /></Field>
            </div>
            <div style={{ marginBottom: 12 }}><Field label="הערות:"><Input value={testForm.notes} onChange={v => setTestForm(p => ({ ...p, notes: v }))} placeholder="אופציונלי..." style={{ width: "100%" }} /></Field></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Btn onClick={runTest}>{testLoading ? "שולח..." : "שלח ליד בדיקה"}</Btn>
              {testResult && <span style={{ fontSize: 11, color: OK, fontWeight: 600 }}>✓ ליד נוסף בהצלחה לרשימת הלידים!</span>}
            </div>
          </div>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 10 }}>תגובת מערכת (JSON)</div>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: SURF, borderRadius: 7, padding: 12, color: TEXT, border: `1px solid ${BORDER}`, minHeight: 80, lineHeight: 1.8, whiteSpace: "pre" }}>
              {testResult ? JSON.stringify(testResult, null, 2) : "ממתין לבדיקה..."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
