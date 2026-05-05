"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Stat, Btn, Input, Modal, FormRow, Field, PageShell } from "@/components/ui";
import { NAVY, GOLD, MUTED, TEXT, WHITE, BORDER, OK, ERR, SURF } from "@/lib/tokens";

export default function AutomationsPage() {
  const { autos, setAutos } = useApp();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "ליד נוצר", action: "שלח מייל + צור משימה" });

  const save = () => {
    if (!form.name) { alert("שם הוא שדה חובה"); return; }
    setAutos(p => [{ ...form, id: Date.now(), active: true, runs: 0 }, ...p]);
    setModal(false);
    setForm({ name: "", trigger: "ליד נוצר", action: "שלח מייל + צור משימה" });
  };

  return (
    <PageShell>
      {modal && (
        <Modal title="🔄 אוטומציה חדשה" onClose={() => setModal(false)}>
          <div style={{ marginBottom: 10 }}>
            <Field label="שם *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם האוטומציה" style={{ width: "100%" }} /></Field>
          </div>
          <FormRow>
            <Field label="כאשר (Trigger)"><Input value={form.trigger} onChange={v => setForm(p => ({ ...p, trigger: v }))} placeholder="ליד נוצר" style={{ width: "100%" }} /></Field>
            <Field label="אז (Action)"><Input value={form.action} onChange={v => setForm(p => ({ ...p, action: v }))} placeholder="שלח מייל" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save}>✓ צור</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🔄 אוטומציות</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>When → Then · ללא קוד</div>
        </div>
        <Btn onClick={() => setModal(true)}>+ אוטומציה חדשה</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="פעילות"      value={autos.filter(a => a.active).length} color={OK} />
        <Stat label="הרצות"       value={autos.reduce((s, a) => s + a.runs, 0)} sub="↑ 34%" trend="up" />
        <Stat label="שעות שנחסכו" value="~42h" color={GOLD} />
      </div>

      {autos.map(a => (
        <div key={a.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 12, display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: a.active ? NAVY : SURF, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
            {a.active ? "⚡" : "💤"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: TEXT, fontSize: 12 }}>{a.name}</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 2, display: "flex", gap: 6 }}>
              <span style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 7px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>כאשר: {a.trigger}</span>
              <span>→</span>
              <span style={{ background: "#F0FDF4", color: OK, padding: "2px 7px", borderRadius: 4, fontWeight: 600, fontSize: 10 }}>אז: {a.action}</span>
            </div>
          </div>
          <div style={{ textAlign: "center", minWidth: 40 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: a.active ? NAVY : MUTED }}>{a.runs}</div>
            <div style={{ fontSize: 9, color: MUTED }}>הרצות</div>
          </div>
          <div onClick={() => setAutos(p => p.map(x => x.id === a.id ? { ...x, active: !x.active } : x))}
            style={{ width: 38, height: 20, borderRadius: 10, background: a.active ? OK : BORDER, cursor: "pointer", position: "relative", flexShrink: 0 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: WHITE, position: "absolute", top: 3, left: a.active ? 21 : 3, transition: "left 0.2s" }} />
          </div>
          <button onClick={() => setAutos(p => p.filter(x => x.id !== a.id))}
            style={{ fontSize: 10, padding: "3px 6px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, flexShrink: 0, fontFamily: "inherit" }}>🗑</button>
        </div>
      ))}
    </PageShell>
  );
}
