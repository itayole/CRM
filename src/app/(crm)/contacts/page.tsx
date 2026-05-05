"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Btn, Input, Modal, FormRow, Field } from "@/components/ui";
import { NAVY, GOLD, GOLD_L, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import type { ClientContact } from "@/lib/types";

const COLORS = [NAVY, BLUE, "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706"];

export default function ContactsPage() {
  const { contacts, setContacts, clients, clientContacts, setClientContacts } = useApp();
  const [selClientId, setSelClientId] = useState<number | null>(null);
  const [selContactId, setSelContactId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [addContactModal, setAddContactModal] = useState<number | false>(false);
  const [form, setForm] = useState({ name: "", title: "", email: "", phone: "", main: false, notes: "" });

  const getClientContacts = (clientId: number) => clientContacts.filter(cc => cc.clientId === clientId);
  const standaloneContacts = contacts.filter(ct => !clientContacts.some(cc => cc.name === ct.name && cc.email === ct.email));

  const filteredClients = clients.filter(cl =>
    !search ||
    cl.name.toLowerCase().includes(search.toLowerCase()) ||
    getClientContacts(cl.id).some(cc => cc.name.toLowerCase().includes(search.toLowerCase()) || (cc.email || "").toLowerCase().includes(search.toLowerCase()))
  );

  const allContacts = [...clientContacts, ...contacts.map(c => ({ ...c, clientId: null as any }))];
  const selContact = selContactId ? allContacts.find(c => c.id === selContactId) : null;

  const saveContact = (clientId: number) => {
    if (!form.name) { alert("שם הוא שדה חובה"); return; }
    const newContact: ClientContact = { ...form, id: Date.now(), clientId, lastContact: new Date().toISOString().slice(0, 10), deals: 0, role: form.title };
    setClientContacts(p => [...p, newContact]);
    setAddContactModal(false);
    setForm({ name: "", title: "", email: "", phone: "", main: false, notes: "" });
  };

  const deleteContact = (id: number) => {
    setClientContacts(p => p.filter(c => c.id !== id));
    setContacts(p => p.filter(c => c.id !== id));
    setSelContactId(null);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>

      {addContactModal !== false && (
        <Modal title={`👤 איש קשר חדש — ${clients.find(c => c.id === addContactModal)?.name || ""}`}
          onClose={() => { setAddContactModal(false); setForm({ name: "", title: "", email: "", phone: "", main: false, notes: "" }); }}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="תפקיד"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="CEO / CTO / VP..." style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="name@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="05X-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות..." style={{ width: "100%" }} /></Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.main} onChange={e => setForm(p => ({ ...p, main: e.target.checked }))} />
            סמן כאיש קשר ראשי של הלקוח
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={() => saveContact(addContactModal as number)}>✓ שמור</Btn>
            <Btn onClick={() => setAddContactModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      {/* Main list */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>👤 אנשי קשר</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>מאורגן לפי לקוח · {clientContacts.length} אנשי קשר</div>
          </div>
        </div>
        <Input value={search} onChange={setSearch} placeholder="🔍 חיפוש לפי לקוח או שם..." style={{ width: "100%", marginBottom: 14 }} />

        {filteredClients.map(cl => {
          const clContacts = getClientContacts(cl.id);
          const isExpanded = selClientId === cl.id;
          const mainContact = clContacts.find(c => c.main);
          return (
            <div key={cl.id} style={{ marginBottom: 10, border: `1px solid ${isExpanded ? NAVY : BORDER}`, borderRadius: 10, overflow: "hidden" }}>
              <div onClick={() => { setSelClientId(isExpanded ? null : cl.id); setSelContactId(null); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: isExpanded ? NAVY : WHITE, cursor: "pointer" }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: isExpanded ? "rgba(255,255,255,0.15)" : SURF, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏢</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: isExpanded ? WHITE : TEXT }}>{cl.name}</div>
                  <div style={{ fontSize: 11, color: isExpanded ? "rgba(255,255,255,0.65)" : MUTED, marginTop: 1 }}>
                    {cl.industry} · {clContacts.length} {clContacts.length === 1 ? "איש קשר" : "אנשי קשר"}{mainContact ? ` · ${mainContact.name} (ראשי)` : ""}
                  </div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: cl.status === "active" ? (isExpanded ? "rgba(255,255,255,0.15)" : "#EAF3DE") : "#FEF3DC", color: cl.status === "active" ? (isExpanded ? WHITE : OK) : WARN }}>
                  {cl.status === "active" ? "✓ פעיל" : "מתעניין"}
                </span>
                <div style={{ width: 26, height: 26, borderRadius: "50%", background: isExpanded ? "rgba(255,255,255,0.15)" : SURF, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: isExpanded ? WHITE : NAVY }}>{clContacts.length}</div>
                <div style={{ fontSize: 12, color: isExpanded ? WHITE : MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</div>
              </div>
              {isExpanded && (
                <div style={{ background: SURF }}>
                  {clContacts.length === 0 && <div style={{ padding: "16px 20px", textAlign: "center", color: MUTED, fontSize: 12 }}>אין אנשי קשר לחברה זו עדיין</div>}
                  {clContacts.map((cc, i) => {
                    const isSel = selContactId === cc.id;
                    return (
                      <div key={cc.id} onClick={e => { e.stopPropagation(); setSelContactId(isSel ? null : cc.id); }}
                        style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px 11px 16px", borderTop: `1px solid ${BORDER}`, background: isSel ? GOLD_L : WHITE, cursor: "pointer" }}>
                        <div style={{ width: 2, height: 36, background: cc.main ? GOLD : BORDER, borderRadius: 1, marginRight: 4, flexShrink: 0 }} />
                        <Av name={cc.name} size={32} color={COLORS[i % COLORS.length]} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{cc.name}</div>
                            {cc.main && <span style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 8, background: GOLD + "33", color: WARN }}>ראשי</span>}
                          </div>
                          <div style={{ fontSize: 11, color: MUTED }}>{cc.role || "—"}</div>
                        </div>
                        <div style={{ textAlign: "left" }}>
                          {cc.email && <div style={{ fontSize: 10, color: MUTED }}>{cc.email}</div>}
                          {cc.phone && <div style={{ fontSize: 10, color: MUTED }}>{cc.phone}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: MUTED }}>›</div>
                      </div>
                    );
                  })}
                  <div style={{ padding: "10px 20px", borderTop: `1px solid ${BORDER}` }}>
                    <button onClick={e => { e.stopPropagation(); setAddContactModal(cl.id); }}
                      style={{ fontSize: 11, fontWeight: 600, padding: "6px 13px", border: `1px dashed ${BORDER}`, borderRadius: 7, background: "transparent", color: MUTED, cursor: "pointer", fontFamily: "inherit" }}>
                      + הוסף איש קשר ל-{cl.name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {standaloneContacts.length > 0 && (
          <div style={{ marginBottom: 10, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: SURF }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED }}>👤 אנשי קשר ללא לקוח ({standaloneContacts.length})</div>
            </div>
            {standaloneContacts.map((ct, i) => (
              <div key={ct.id} onClick={() => setSelContactId(selContactId === ct.id ? null : ct.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: `1px solid ${BORDER}`, background: selContactId === ct.id ? GOLD_L : WHITE, cursor: "pointer" }}>
                <Av name={ct.name} size={32} color={COLORS[i % COLORS.length]} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{ct.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{ct.title}{ct.company ? ` · ${ct.company}` : ""}</div>
                </div>
                <div style={{ fontSize: 10, color: MUTED }}>{ct.lastContact}</div>
                <div style={{ fontSize: 12, color: MUTED }}>›</div>
              </div>
            ))}
          </div>
        )}

        {filteredClients.length === 0 && standaloneContacts.length === 0 && (
          <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>לא נמצאו תוצאות לחיפוש</div>
        )}
      </div>

      {/* Contact detail panel */}
      {selContact && (
        <div style={{ width: 260, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <Av name={selContact.name} size={46} color={NAVY} />
              <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginTop: 8 }}>{selContact.name}</div>
              {(selContact as any).main && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: GOLD + "22", color: WARN }}>איש קשר ראשי ⭐</span>}
              <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{(selContact as any).role || "—"}</div>
              {selContact.clientId && (() => { const pc = clients.find(c => c.id === selContact.clientId); return pc ? <div style={{ fontSize: 11, fontWeight: 600, color: BLUE, marginTop: 2 }}>🏢 {pc.name}</div> : null; })()}
            </div>
            <button onClick={() => setSelContactId(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED }}>✕</button>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {selContact.email && <div style={{ display: "flex", gap: 8, fontSize: 11 }}><span>✉</span><span style={{ color: TEXT }}>{selContact.email}</span></div>}
            {selContact.phone && <div style={{ display: "flex", gap: 8, fontSize: 11 }}><span>📞</span><span style={{ color: TEXT }}>{selContact.phone}</span></div>}
            {selContact.lastContact && <div style={{ display: "flex", gap: 8, fontSize: 11 }}><span>📅</span><span style={{ color: TEXT }}>פנייה: {selContact.lastContact}</span></div>}
          </div>
          {selContact.notes && (
            <div style={{ background: SURF, borderRadius: 7, padding: 9, marginTop: 10, fontSize: 11, color: MUTED, borderRight: `3px solid ${GOLD}` }}>
              📝 {selContact.notes}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
            <button style={{ flex: 1, padding: "7px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✉ מייל</button>
            <button style={{ flex: 1, padding: "7px 0", background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📞 שיחה</button>
            <button onClick={() => { if (window.confirm("למחוק?")) deleteContact(selContact.id); }}
              style={{ padding: "7px 10px", background: WHITE, color: ERR, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
          </div>
        </div>
      )}
    </div>
  );
}
