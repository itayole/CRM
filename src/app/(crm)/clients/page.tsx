"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Stat, StTag, Btn, Input, Select, Modal, FormRow, Field, PageShell } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { NAVY, GOLD, GOLD_L, BLUE, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR, SURF } from "@/lib/tokens";

export default function ClientsPage() {
  const { visibleClients: clients, setClients, clientContacts, visibleDeals: deals } = useApp();
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const emptyForm = { name: "", industry: "טכנולוגיה", email: "", phone: "", address: "", website: "", size: "10-50", status: "active", assignee: "מיכל כהן", notes: "" };
  const [form, setForm] = useState(emptyForm);

  const filtered = clients.filter(c => !search || c.name.includes(search) || c.industry.includes(search));

  const save = () => {
    if (!form.name) { alert("שם חברה הוא שדה חובה"); return; }
    setClients(p => [{ ...form, id: Date.now(), since: new Date().toISOString().slice(0, 10) } as any, ...p]);
    setModal(false);
    setForm(emptyForm);
  };

  const cl = selected ? clients.find(c => c.id === selected) : null;
  const clContacts = cl ? clientContacts.filter(c => c.clientId === cl.id) : [];
  const clDeals = cl ? deals.filter(d => d.company === cl.name) : [];

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      {modal && (
        <Modal title="🏢 לקוח חדש" onClose={() => setModal(false)} width={560}>
          <FormRow>
            <Field label="שם חברה *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
            <Field label="תעשייה">
              <Select value={form.industry} onChange={v => setForm(p => ({ ...p, industry: v }))} options={["טכנולוגיה", "פיננסים", "שיווק", "רכב", "בריאות", "נדל\"ן", "אחר"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="info@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="03-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="כתובת"><Input value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="תל אביב" style={{ width: "100%" }} /></Field>
            <Field label="גודל">
              <Select value={form.size} onChange={v => setForm(p => ({ ...p, size: v }))} options={["1-10", "10-50", "50-200", "200+"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות..." style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, resize: "vertical", minHeight: 60, outline: "none", fontFamily: "inherit" }} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save}>✓ שמור לקוח</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🏢 לקוחות</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{filtered.length} לקוחות</div>
          </div>
          <Btn onClick={() => setModal(true)}>+ לקוח חדש</Btn>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ לקוחות"  value={clients.length} color={NAVY} />
          <Stat label="פעילים"        value={clients.filter(c => c.status === "active").length} color={OK} />
          <Stat label="מתעניינים"     value={clients.filter(c => c.status === "prospect").length} color={WARN} />
          <Stat label="שווי כולל"     value={fmt(clients.reduce((s, c) => s + deals.filter(d => d.company === c.name).reduce((ss, d) => ss + d.value, 0), 0))} color={OK} />
        </div>
        <Input value={search} onChange={setSearch} placeholder="🔍 חיפוש לקוח..." style={{ width: "100%", marginBottom: 12 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {filtered.map(c => {
            const cds = deals.filter(d => d.company === c.name);
            const ccs = clientContacts.filter(x => x.clientId === c.id);
            return (
              <div key={c.id} onClick={() => setSelected(selected === c.id ? null : c.id)}
                style={{ background: selected === c.id ? GOLD_L : WHITE, border: `1px solid ${selected === c.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer", position: "relative" }}>
                <div style={{ position: "absolute", top: 10, left: 10 }}>
                  <span style={{ background: c.status === "active" ? "#E6F4EE" : "#FEF3DC", color: c.status === "active" ? OK : WARN, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                    {c.status === "active" ? "✓ פעיל" : "מתעניין"}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, marginTop: 6 }}>
                  <Av name={c.name} size={38} color={NAVY} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{c.industry} · {c.size} עובדים</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 10 }}>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{cds.length}</div><div style={{ fontSize: 9, color: MUTED }}>עסקאות</div></div>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>{ccs.length}</div><div style={{ fontSize: 9, color: MUTED }}>אנשי קשר</div></div>
                  <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 13, fontWeight: 800, color: OK }}>{fmt(cds.reduce((s, d) => s + d.value, 0))}</div><div style={{ fontSize: 9, color: MUTED }}>שווי</div></div>
                </div>
                {c.email && <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>✉ {c.email}</div>}
                {c.phone && <div style={{ fontSize: 10, color: MUTED }}>📞 {c.phone}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button onClick={e => { e.stopPropagation(); if (window.confirm("למחוק?")) setClients(p => p.filter(x => x.id !== c.id)); }}
                    style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {cl && (
        <div style={{ width: 280, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <Av name={cl.name} size={48} color={NAVY} />
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, marginTop: 8 }}>{cl.name}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{cl.industry}</div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>פרטי קשר</div>
            {cl.email   && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>✉ {cl.email}</div>}
            {cl.phone   && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📞 {cl.phone}</div>}
            {cl.address && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📍 {cl.address}</div>}
          </div>
          {clContacts.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>אנשי קשר</div>
              {clContacts.map(cc => (
                <div key={cc.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <Av name={cc.name} size={26} color={BLUE} />
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{cc.name}{cc.main ? " ⭐" : ""}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{cc.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {clDeals.length > 0 && (
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>עסקאות</div>
              {clDeals.map(d => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11 }}>
                  <div><div style={{ fontWeight: 600, color: TEXT }}>{d.title}</div><StTag sid={d.stage} /></div>
                  <div style={{ fontWeight: 700, color: NAVY }}>{fmt(d.value)}</div>
                </div>
              ))}
            </div>
          )}
          {cl.notes && <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 4, fontSize: 11, color: MUTED }}><div style={{ fontWeight: 700, marginBottom: 4 }}>הערות</div>{cl.notes}</div>}
        </div>
      )}
    </div>
  );
}
