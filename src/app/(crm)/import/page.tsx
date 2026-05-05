"use client";

import { useState } from "react";
import { Btn, PageShell } from "@/components/ui";
import { NAVY, GOLD, GOLD_L, WHITE, MUTED, TEXT, BORDER, OK, SURF } from "@/lib/tokens";

const TYPES = [
  { id: "leads",    icon: "⚡", label: "לידים",      desc: "לידים פוטנציאליים" },
  { id: "clients",  icon: "🏢", label: "לקוחות",     desc: "בסיס לקוחות" },
  { id: "deals",    icon: "◫", label: "עסקאות",     desc: "Pipeline" },
  { id: "contacts", icon: "👤", label: "אנשי קשר",  desc: "ספר טלפונים" },
];

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [type, setType] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>⬆ שאיבת תוכן</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>ייבוא נתונים מקובץ Excel / CSV</div>
      </div>

      {/* Step indicators */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
        {["העלאת קובץ", "מיפוי עמודות", "תצוגה מקדימה", "סיום"].map((lbl, i) => {
          const active = step === i + 1, done = step > i + 1;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", flex: i > 0 ? 1 : "auto" }}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: done ? OK : BORDER }} />}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: done ? OK : active ? NAVY : BORDER, color: (done || active) ? WHITE : MUTED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>
                  {done ? "✓" : i + 1}
                </div>
                <div style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? NAVY : MUTED }}>{lbl}</div>
              </div>
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>1. בחר סוג נתונים לייבוא</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
            {TYPES.map(tc => (
              <div key={tc.id} onClick={() => setType(tc.id)}
                style={{ border: `2px solid ${type === tc.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, textAlign: "center", cursor: "pointer", background: type === tc.id ? GOLD_L : WHITE }}>
                <div style={{ fontSize: 24, marginBottom: 5 }}>{tc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{tc.label}</div>
                <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{tc.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: NAVY, marginBottom: 10 }}>2. העלה קובץ</div>
          <label style={{ display: "block", border: "2px dashed " + BORDER, borderRadius: 10, padding: 32, textAlign: "center", cursor: "pointer", background: SURF }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 4 }}>לחץ לבחירת קובץ</div>
            <div style={{ fontSize: 11, color: MUTED }}>תומך בקבצי .xlsx / .xls / .csv</div>
            <input type="file" accept=".xlsx,.xls,.csv"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); if (type) setStep(2); } }}
              style={{ display: "none" }} />
          </label>

          <div style={{ marginTop: 12, padding: "10px 14px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <div style={{ flex: 1, fontSize: 11, color: MUTED }}>לא בטוח בפורמט? הורד תבנית Excel מוכנה</div>
            <button style={{ fontSize: 11, padding: "5px 11px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: TEXT, fontFamily: "inherit" }}>⬇ הורד תבנית</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{file ? file.name : "קובץ הועלה"}</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>מיפוי אוטומטי לשדות {({ leads: "לידים", clients: "לקוחות", deals: "עסקאות", contacts: "אנשי קשר" } as Record<string, string>)[type] || type}</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => setStep(3)}>המשך לתצוגה מקדימה →</Btn>
            <Btn onClick={() => setStep(1)} variant="secondary">← חזור</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>👁</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 4 }}>תצוגה מקדימה</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>3 שורות לדוגמה מהקובץ</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Btn onClick={() => setStep(4)}>ייבא רשומות</Btn>
            <Btn onClick={() => setStep(2)} variant="secondary">← חזור</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: OK, marginBottom: 4 }}>ייבוא הושלם בהצלחה!</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>הרשומות יובאו למערכת</div>
          <Btn onClick={() => { setStep(1); setType(""); setFile(null); }}>↺ ייבוא נוסף</Btn>
        </div>
      )}
    </PageShell>
  );
}
