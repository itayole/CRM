"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Bdg, Btn, Input, Select, Modal, FormRow, Field } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { LEAD_STATUS } from "@/lib/mockData";
import { NAVY, GOLD, GOLD_L, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import type { Lead } from "@/lib/types";

const COLORS = [NAVY, BLUE, "#7C3AED", "#0891B2", "#059669", "#DC2626", "#D97706"];
const ACT_ICONS: Record<string, string> = { note: "📝", call: "📞", email: "✉", meeting: "🤝", status: "🔄" };

export default function LeadsPage() {
  const { visibleLeads: leads, setLeads } = useApp();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selId, setSelId] = useState<number | null>(null);
  const [selCompany, setSelCompany] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [dupWarning, setDupWarning] = useState<{ msg: string; match: Lead } | null>(null);

  const emptyForm = { name: "", company: "", email: "", phone: "", status: "new", value: "", source: "", assignee: "מיכל כהן", notes: "" };
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const checkDuplicate = (f: typeof emptyForm, existing: Lead[]) => {
    const norm = (s = "") => s.trim().toLowerCase().replace(/[-\s]/g, "");
    for (const l of existing) {
      if (f.phone && norm(f.phone) && norm(l.phone) === norm(f.phone))
        return { msg: `טלפון זהה לליד קיים: ${l.name}`, match: l };
      if (f.company && norm(f.company) && norm(l.company) === norm(f.company))
        return { msg: `חברה זהה לליד קיים: ${l.name} (${l.company})`, match: l };
      if (f.name && norm(f.name) && norm(l.name) === norm(f.name))
        return { msg: `שם זהה לליד קיים: ${l.name}`, match: l };
    }
    return null;
  };

  const handleFormChange = (key: string, val: string) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    if (["name", "company", "phone"].includes(key)) setDupWarning(checkDuplicate(updated, leads));
  };

  const save = (force = false) => {
    if (!form.name || !form.company) { alert("שם וחברה הם שדות חובה"); return; }
    if (!force && dupWarning) return;
    setLeads(p => [{ ...form, id: Date.now(), score: Math.floor(Math.random() * 40 + 50), value: parseFloat(form.value) || 0, activity: [] } as Lead, ...p]);
    setModal(false); setForm(emptyForm); setDupWarning(null);
  };

  const updateLead = (id: number, key: string, val: string) =>
    setLeads(p => p.map(l => l.id === id ? { ...l, [key]: val } : l));

  const addNote = (id: number, note: string) => {
    if (!note.trim()) return;
    setLeads(p => p.map(l => l.id === id
      ? { ...l, activity: [{ type: "note", text: note, time: "עכשיו", user: "מיכל כהן" }, ...(l.activity || [])] }
      : l));
  };

  const filtered = leads.filter(l =>
    (filter === "all" || l.status === filter) &&
    (l.name.includes(search) || l.company.includes(search) || (l.email || "").includes(search) || (l.phone || "").includes(search))
  );

  const groups = (() => {
    const map: Record<string, Lead[]> = {};
    for (const l of filtered) {
      const key = (l.company || "ללא חברה").trim();
      if (!map[key]) map[key] = [];
      map[key].push(l);
    }
    return Object.entries(map)
      .map(([company, items]) => ({ company, leads: items }))
      .sort((a, b) => Math.max(...b.leads.map(l => l.score || 0)) - Math.max(...a.leads.map(l => l.score || 0)));
  })();

  const groupStatus = (items: Lead[]) => {
    for (const s of ["qualified", "contacted", "new", "disqualified"]) {
      if (items.some(l => l.status === s)) return s;
    }
    return "new";
  };

  const sel = selId ? leads.find(l => l.id === selId) : null;

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>

      {/* New lead modal */}
      {modal && (
        <Modal title="+ ליד חדש" onClose={() => { setModal(false); setDupWarning(null); setForm(emptyForm); }}>
          {dupWarning && (
            <div style={{ background: "#FEF3DC", border: `1px solid ${WARN}`, borderRadius: 8, padding: "10px 13px", marginBottom: 14, display: "flex", gap: 9, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: WARN, marginBottom: 2 }}>ליד דומה כבר קיים במערכת</div>
                <div style={{ fontSize: 11, color: TEXT }}>{dupWarning.msg}</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>מייל: {dupWarning.match.email || "—"} · טלפון: {dupWarning.match.phone || "—"} · סטטוס: {LEAD_STATUS[dupWarning.match.status]?.label}</div>
              </div>
            </div>
          )}
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => handleFormChange("name", v)} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="חברה *"><Input value={form.company} onChange={v => handleFormChange("company", v)} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => handleFormChange("email", v)} placeholder="email@co.il" style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={form.phone} onChange={v => handleFormChange("phone", v)} placeholder="05X-XXXXXXX" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שווי"><Input value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="50000" type="number" style={{ width: "100%" }} /></Field>
            <Field label="מקור">
              <Select value={form.source} onChange={v => setForm(p => ({ ...p, source: v }))} options={["", "LinkedIn", "Web Form", "Email", "Meta Ads", "WhatsApp", "המלצה"].map(x => ({ value: x, label: x || "בחר מקור" }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="סטטוס">
              <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={[{ value: "new", label: "חדש" }, { value: "contacted", label: "פנייה" }, { value: "qualified", label: "מוסמך" }, { value: "disqualified", label: "נפסל" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="נציג">
              <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={["מיכל כהן", "ירון לוי", "אייל נחמני"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות">
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="הערות ראשוניות..." rows={2}
                style={{ width: "100%", fontSize: 12, padding: "8px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontFamily: "inherit", resize: "none", outline: "none" }} />
            </Field>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {dupWarning ? (
              <>
                <button onClick={() => save(true)} style={{ background: WARN, color: WHITE, border: "none", borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>הוסף בכל זאת</button>
                <button onClick={() => { setSelId(dupWarning.match.id); setSelCompany(dupWarning.match.company); setModal(false); setDupWarning(null); }}
                  style={{ background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, padding: "8px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>פתח ליד קיים</button>
                <Btn onClick={() => { setModal(false); setDupWarning(null); setForm(emptyForm); }} variant="secondary">ביטול</Btn>
              </>
            ) : (
              <>
                <Btn onClick={() => save(false)}>✓ שמור ליד</Btn>
                <Btn onClick={() => { setModal(false); setForm(emptyForm); }} variant="secondary">ביטול</Btn>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Company-grouped list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 11, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>ניהול לידים</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{groups.length} חברות · {filtered.length} אנשי קשר</div>
          </div>
          <Btn onClick={() => { setForm(emptyForm); setDupWarning(null); setModal(true); }}>+ ליד חדש</Btn>
        </div>

        <div style={{ display: "flex", gap: 7, marginBottom: 10, flexShrink: 0 }}>
          <Input value={search} onChange={setSearch} placeholder="🔍 חברה, שם, מייל, טלפון..." style={{ flex: 1 }} />
          {(["all", "new", "contacted", "qualified", "disqualified"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              style={{ padding: "7px 10px", borderRadius: 7, border: `1px solid ${filter === s ? NAVY : BORDER}`, background: filter === s ? NAVY : WHITE, color: filter === s ? WHITE : TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {{ all: "הכל", new: "חדש", contacted: "פנייה", qualified: "מוסמך", disqualified: "נפסל" }[s]}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {groups.length === 0 && <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>אין לידים תואמים</div>}
          {groups.map(group => {
            const isExpanded = selCompany === group.company;
            const gs = groupStatus(group.leads);
            const gst = LEAD_STATUS[gs] || LEAD_STATUS.new;
            const bestScore = Math.max(...group.leads.map(l => l.score || 0));
            const bsc = bestScore >= 80 ? OK : bestScore >= 60 ? WARN : ERR;
            const totalValue = group.leads.reduce((s, l) => s + (Number(l.value) || 0), 0);
            return (
              <div key={group.company} style={{ marginBottom: 8, border: `1px solid ${isExpanded ? NAVY : BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                <div onClick={() => { setSelCompany(isExpanded ? null : group.company); if (isExpanded) setSelId(null); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 15px", background: isExpanded ? NAVY : WHITE, cursor: "pointer" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: isExpanded ? "rgba(255,255,255,0.15)" : SURF, border: `1px solid ${isExpanded ? "rgba(255,255,255,0.2)" : BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏢</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isExpanded ? WHITE : TEXT }}>{group.company}</div>
                    <div style={{ fontSize: 11, color: isExpanded ? "rgba(255,255,255,0.6)" : MUTED, marginTop: 1 }}>
                      {group.leads.length} {group.leads.length === 1 ? "איש קשר" : "אנשי קשר"}{group.leads[0]?.source ? ` · ${group.leads[0].source}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: bsc }}>{bestScore}</div>
                      <div style={{ fontSize: 9, color: isExpanded ? "rgba(255,255,255,0.5)" : MUTED }}>ציון</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: isExpanded ? WHITE : NAVY }}>{fmt(totalValue)}</div>
                      <div style={{ fontSize: 9, color: isExpanded ? "rgba(255,255,255,0.5)" : MUTED }}>שווי</div>
                    </div>
                    <Bdg label={gst.label} color={isExpanded ? "rgba(255,255,255,0.9)" : gst.color} />
                    <div style={{ fontSize: 18, color: isExpanded ? "rgba(255,255,255,0.7)" : MUTED, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s", lineHeight: 1 }}>⌄</div>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ background: SURF }}>
                    {group.leads.map((l, li) => {
                      const st = LEAD_STATUS[l.status] || LEAD_STATUS.new;
                      const sc = l.score >= 80 ? OK : l.score >= 60 ? WARN : ERR;
                      const isSel = selId === l.id;
                      return (
                        <div key={l.id} onClick={e => { e.stopPropagation(); setSelId(isSel ? null : l.id); setEditMode(false); }}
                          style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 18px 10px 15px", borderTop: `1px solid ${BORDER}`, background: isSel ? GOLD_L : WHITE, cursor: "pointer" }}>
                          <div style={{ width: 2, height: 32, background: BORDER, borderRadius: 1, marginRight: 4, flexShrink: 0 }} />
                          <Av name={l.name} size={30} color={COLORS[li % COLORS.length]} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 12, color: TEXT }}>{l.name}</div>
                            <div style={{ fontSize: 10, color: MUTED }}>{l.email || "—"}{l.phone ? ` · ${l.phone}` : ""}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: sc }}>{l.score}</span>
                          </div>
                          <Bdg label={st.label} color={st.color} />
                          <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, minWidth: 48, textAlign: "left" }}>{fmt(Number(l.value))}</div>
                          <div style={{ fontSize: 12, color: MUTED }}>›</div>
                        </div>
                      );
                    })}
                    <div style={{ padding: "9px 18px", borderTop: `1px solid ${BORDER}` }}>
                      <button onClick={e => { e.stopPropagation(); setForm({ ...emptyForm, company: group.company }); setDupWarning(null); setModal(true); }}
                        style={{ fontSize: 11, fontWeight: 600, padding: "5px 12px", border: `1px dashed ${BORDER}`, borderRadius: 7, background: "transparent", color: MUTED, cursor: "pointer", fontFamily: "inherit" }}>
                        + הוסף איש קשר ל-{group.company}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead detail panel */}
      {sel && (
        <div style={{ width: 300, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, display: "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>
          <div style={{ padding: "13px 15px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <Av name={sel.name} size={38} color={NAVY} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{sel.name}</div>
                <div style={{ fontSize: 11, color: BLUE, fontWeight: 600 }}>🏢 {sel.company}</div>
              </div>
            </div>
            <button onClick={() => { setSelId(null); setEditMode(false); }} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>ציון AI</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, height: 5, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${sel.score}%`, height: "100%", background: sel.score >= 80 ? OK : sel.score >= 60 ? WARN : ERR, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: sel.score >= 80 ? OK : sel.score >= 60 ? WARN : ERR }}>{sel.score}</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: MUTED, marginBottom: 3 }}>סטטוס</div>
                <Bdg label={LEAD_STATUS[sel.status]?.label || sel.status} color={LEAD_STATUS[sel.status]?.color || MUTED} />
              </div>
            </div>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 9 }}>פרטי קשר</div>
              {[{ icon: "✉", val: sel.email }, { icon: "📞", val: sel.phone }, { icon: "🏢", val: sel.company }, { icon: "👤", val: sel.assignee }].map(({ icon, val }) => (
                <div key={icon} style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 7 }}>
                  <span style={{ fontSize: 13, width: 18, flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontSize: 11, color: val ? TEXT : MUTED }}>{val || "—"}</span>
                </div>
              ))}
            </div>
            <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ label: "שווי", val: fmt(Number(sel.value)) }, { label: "מקור", val: sel.source || "—" }, { label: "נציג", val: sel.assignee }, { label: "נוצר", val: "—" }].map(({ label, val }) => (
                  <div key={label}><div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div><div style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{val}</div></div>
                ))}
              </div>
            </div>
            {sel.notes && (
              <div style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 7 }}>הערות</div>
                <div style={{ fontSize: 11, color: TEXT, lineHeight: 1.5 }}>{sel.notes}</div>
              </div>
            )}
            <div style={{ padding: "11px 15px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 9 }}>יומן פעילות</div>
              {[...(sel.activity || []), { type: "email", text: "נשלח מייל היכרות", time: "לפני 3 ימים", user: sel.assignee }, { type: "call", text: "שיחת טלפון — 12 דק׳", time: "לפני 5 ימים", user: sel.assignee }].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: SURF, border: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>
                    {ACT_ICONS[a.type] || "📌"}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>{a.text}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>{a.time} · {a.user}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "9px 14px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 5 }}>
            <button style={{ flex: 1, padding: "7px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✉ מייל</button>
            <button style={{ flex: 1, padding: "7px 0", background: WHITE, color: NAVY, border: `1px solid ${NAVY}`, borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>📞 שיחה</button>
            <button onClick={() => { if (window.confirm("למחוק ליד זה?")) { setLeads(p => p.filter(x => x.id !== sel.id)); setSelId(null); } }}
              style={{ padding: "7px 9px", background: WHITE, color: ERR, border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
          </div>
        </div>
      )}
    </div>
  );
}
