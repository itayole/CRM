"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { HBar, Btn, Modal, FormRow, Field, Input, Select } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { STAGES } from "@/lib/mockData";
import { NAVY, GOLD, GOLD_L, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";

export default function PipelinePage() {
  const { visibleDeals: deals, setDeals } = useApp();
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropSt, setDropSt] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", company: "", value: "", probability: "50", stage: "lead", assignee: "מיכל כהן", closeDate: "" });

  const pipe = deals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);

  const save = () => {
    if (!form.title || !form.company) { alert("כותרת וחברה הם שדות חובה"); return; }
    setDeals(p => [{ ...form, id: Date.now(), value: parseFloat(form.value) || 0, probability: parseInt(form.probability) || 50, health: 60 } as any, ...p]);
    setModal(false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {modal && (
        <Modal title="+ עסקה חדשה" onClose={() => setModal(false)}>
          <FormRow>
            <Field label="שם עסקה *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="שם העסקה" style={{ width: "100%" }} /></Field>
            <Field label="חברה *"><Input value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שווי (₪)"><Input value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="120000" type="number" style={{ width: "100%" }} /></Field>
            <Field label="הסתברות %"><Input value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} placeholder="60" type="number" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שלב">
              <Select value={form.stage} onChange={v => setForm(p => ({ ...p, stage: v }))} options={STAGES.map(s => ({ value: s.id, label: s.label }))} style={{ width: "100%" }} />
            </Field>
            <Field label="תאריך סגירה"><Input value={form.closeDate} onChange={v => setForm(p => ({ ...p, closeDate: v }))} type="date" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save}>✓ שמור</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>ניהול Pipeline</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>גרור עסקאות בין שלבים</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ fontSize: 12, color: MUTED, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "7px 12px", fontWeight: 600 }}>
            סה״כ: <span style={{ color: NAVY, fontWeight: 800 }}>{fmt(pipe)}</span>
          </div>
          <Btn onClick={() => setModal(true)}>+ עסקה</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, overflowX: "auto", flex: 1, paddingBottom: 6 }}>
        {STAGES.map(stage => {
          const sd = deals.filter(d => d.stage === stage.id);
          const isOver = dropSt === stage.id;
          return (
            <div key={stage.id}
              style={{ minWidth: 190, width: 190, display: "flex", flexDirection: "column", gap: 6, background: isOver ? GOLD_L : SURF, borderRadius: 9, border: `2px solid ${isOver ? GOLD : "transparent"}`, padding: 9 }}
              onDragOver={e => { e.preventDefault(); setDropSt(stage.id); }}
              onDrop={() => { if (dragId) setDeals(ds => ds.map(d => d.id === dragId ? { ...d, stage: stage.id as any } : d)); setDragId(null); setDropSt(null); }}
              onDragLeave={() => setDropSt(null)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color }} />
                  <span style={{ fontWeight: 700, fontSize: 11, color: TEXT }}>{stage.label}</span>
                </div>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{fmt(sd.reduce((s, d) => s + d.value, 0))}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {sd.length === 0 && <div style={{ textAlign: "center", padding: "14px 0", fontSize: 11, color: MUTED }}>גרור עסקה לכאן</div>}
                {sd.map(deal => (
                  <div key={deal.id} draggable onDragStart={() => setDragId(deal.id)}
                    style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: 9, cursor: "grab", borderLeft: `3px solid ${stage.color}` }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: TEXT, marginBottom: 2 }}>{deal.title}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 5 }}>{deal.company}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{fmt(deal.value)}</div>
                    <HBar score={deal.health} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{deal.closeDate}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: deal.probability >= 70 ? OK : deal.probability >= 40 ? WARN : ERR }}>{deal.probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
