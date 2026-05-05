"use client";

import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Stat, Btn, Input, Select, Modal, FormRow, Field } from "@/components/ui";
import { NAVY, GOLD, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import { fmt } from "@/lib/utils";
import type { Project, ProjectPhase } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = { active: OK, planning: BLUE, completed: MUTED, paused: WARN };
const STATUS_LABEL: Record<string, string> = { active: "פעיל", planning: "תכנון", completed: "הושלם", paused: "מושהה" };
const PHASE_COLOR: Record<string, string>  = { done: OK, active: BLUE, pending: MUTED, blocked: ERR };
const PHASE_LABEL: Record<string, string>  = { done: "הושלם", active: "בעבודה", pending: "ממתין", blocked: "חסום" };
const PRIO_COLOR: Record<string, string>   = { high: ERR, medium: WARN, low: OK };
const PRIO_LABEL: Record<string, string>   = { high: "🔴 גבוהה", medium: "🟡 בינונית", low: "🟢 נמוכה" };

const EMPTY_FORM = { name: "", desc: "", clientId: "", status: "planning", priority: "medium", budget: "", spent: "", progress: 0, startDate: "", endDate: "", assignee: "מיכל כהן", tags: "", contactId: "" };

export default function ProjectsPage() {
  const { projects, setProjects, clients } = useApp();
  const [openId, setOpenId] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [editPhaseId, setEditPhaseId] = useState<number | null>(null);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const save = () => {
    if (!form.name) { alert("שם פרויקט הוא שדה חובה"); return; }
    const newProj: Project = {
      ...form as any,
      id: Date.now(),
      clientId: parseInt(form.clientId) || null as any,
      budget: parseFloat(form.budget) || 0,
      spent: parseFloat(form.spent) || 0,
      progress: Number(form.progress) || 0,
      tags: form.tags ? form.tags.split(",").map((t: string) => t.trim()) : [],
      phases: [],
    };
    setProjects((p: Project[]) => [newProj, ...p]);
    setModal(false);
    setForm(EMPTY_FORM);
  };

  const addPhase = (projId: number) => {
    if (!newPhaseName.trim()) return;
    setProjects((prev: Project[]) => prev.map(p => p.id !== projId ? p : {
      ...p,
      phases: [...(p.phases || []), {
        id: Date.now(), name: newPhaseName.trim(), status: "pending",
        startDate: "", endDate: "", budget: 0, spent: 0, notes: "",
      }],
    }));
    setNewPhaseName("");
  };

  const updatePhase = (projId: number, phaseId: number, key: string, val: any) => {
    setProjects((prev: Project[]) => prev.map(p => p.id !== projId ? p : {
      ...p,
      phases: p.phases.map((ph: ProjectPhase) => ph.id !== phaseId ? ph : { ...ph, [key]: val }),
    }));
  };

  const deletePhase = (projId: number, phaseId: number) => {
    setProjects((prev: Project[]) => prev.map(p => p.id !== projId ? p : {
      ...p, phases: p.phases.filter((ph: ProjectPhase) => ph.id !== phaseId),
    }));
  };

  const openProj = projects.find((p: Project) => p.id === openId);

  if (openProj) {
    const cl  = clients.find((c: any) => c.id === openProj.clientId) || { name: "—" };
    const sc  = STATUS_COLOR[openProj.status] || MUTED;
    const pct = Math.round((openProj.spent || 0) / Math.max(openProj.budget || 1, 1) * 100);
    const remaining = (openProj.budget || 0) - (openProj.spent || 0);
    const phases = openProj.phases || [];
    const donePhases = phases.filter((ph: ProjectPhase) => ph.status === "done").length;

    return (
      <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button onClick={() => setOpenId(null)} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "6px 12px", fontSize: 12, cursor: "pointer", color: TEXT, fontFamily: "inherit" }}>← חזרה לפרויקטים</button>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{openProj.name}</div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: sc + "22", color: sc }}>{STATUS_LABEL[openProj.status]}</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: PRIO_COLOR[openProj.priority] + "22", color: PRIO_COLOR[openProj.priority] }}>{PRIO_LABEL[openProj.priority]}</span>
          {(openProj.tags || []).map((t: string, i: number) => <span key={i} style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 10, background: "#EEF2FF", color: "#4F46E5" }}>{t}</span>)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 12 }}>פרטי פרויקט</div>
            {openProj.desc && <div style={{ fontSize: 12, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>{openProj.desc}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {([
                ["🏢 לקוח", cl.name],
                ["👤 מנהל פרויקט", openProj.assignee],
                ["📅 התחלה", openProj.startDate || "—"],
                ["🏁 סיום מתוכנן", openProj.endDate || "—"],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: TEXT }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 5 }}>
                <span>התקדמות כוללת</span>
                <span style={{ color: sc }}>{openProj.progress}%</span>
              </div>
              <div style={{ height: 8, background: BORDER, borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${openProj.progress}%`, height: "100%", background: sc, borderRadius: 4, transition: "width .5s" }} />
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{donePhases} מתוך {phases.length} שלבים הושלמו</div>
            </div>
          </div>

          <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT, marginBottom: 12 }}>פרטים פיננסיים</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { label: "תקציב", value: fmt(openProj.budget), color: NAVY },
                { label: "בוצע", value: fmt(openProj.spent), color: pct > 90 ? ERR : OK },
                { label: "יתרה", value: fmt(remaining), color: remaining < 0 ? ERR : OK },
              ].map(s => (
                <div key={s.label} style={{ background: SURF, borderRadius: 8, padding: "10px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                <span>ניצול תקציב</span>
                <span style={{ color: pct > 90 ? ERR : pct > 70 ? WARN : OK }}>{pct}%</span>
              </div>
              <div style={{ height: 10, background: BORDER, borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: pct > 90 ? ERR : pct > 70 ? WARN : OK, borderRadius: 5 }} />
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6 }}>תקציב לפי שלב</div>
            {phases.map((ph: ProjectPhase) => {
              const phPct = Math.round((ph.spent || 0) / Math.max(ph.budget || 1, 1) * 100);
              return (
                <div key={ph.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: TEXT }}>{ph.name}</span>
                  <span style={{ color: MUTED }}>{fmt(ph.spent)} / {fmt(ph.budget)} <span style={{ color: phPct > 90 ? ERR : MUTED }}>({phPct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>שלבי הפרויקט ({phases.length})</div>
          </div>

          {phases.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>אין שלבים עדיין — הוסף שלב ראשון</div>
          )}

          {phases.map((ph: ProjectPhase, idx: number) => {
            const phSc = PHASE_COLOR[ph.status] || MUTED;
            const isEditing = editPhaseId === ph.id;
            return (
              <div key={ph.id} style={{ borderBottom: idx < phases.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: phSc + "22", border: `2px solid ${phSc}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 700, color: phSc }}>
                    {ph.status === "done" ? "✓" : idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{ph.name}</div>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: phSc + "22", color: phSc }}>{PHASE_LABEL[ph.status]}</span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 11, color: MUTED }}>
                      {ph.startDate && <span>📅 {ph.startDate} → {ph.endDate || "—"}</span>}
                      {ph.budget > 0 && <span>💰 {fmt(ph.spent)} / {fmt(ph.budget)}</span>}
                      {ph.notes && <span>📝 {ph.notes}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setEditPhaseId(isEditing ? null : ph.id)}
                      style={{ fontSize: 10, padding: "4px 9px", border: `1px solid ${BORDER}`, borderRadius: 6, background: isEditing ? NAVY : WHITE, color: isEditing ? WHITE : TEXT, cursor: "pointer", fontFamily: "inherit" }}>
                      {isEditing ? "סגור" : "✎ ערוך"}
                    </button>
                    <button onClick={() => deletePhase(openProj.id, ph.id)}
                      style={{ fontSize: 10, padding: "4px 8px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, color: ERR, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ margin: "0 16px 14px", padding: 14, background: SURF, borderRadius: 8, border: `1px solid ${BORDER}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>סטטוס</div>
                        <select value={ph.status} onChange={e => updatePhase(openProj.id, ph.id, "status", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }}>
                          {Object.entries(PHASE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תאריך התחלה</div>
                        <input type="date" value={ph.startDate} onChange={e => updatePhase(openProj.id, ph.id, "startDate", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תאריך סיום</div>
                        <input type="date" value={ph.endDate} onChange={e => updatePhase(openProj.id, ph.id, "endDate", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>תקציב שלב (₪)</div>
                        <input type="number" value={ph.budget} onChange={e => updatePhase(openProj.id, ph.id, "budget", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>בוצע (₪)</div>
                        <input type="number" value={ph.spent} onChange={e => updatePhase(openProj.id, ph.id, "spent", parseFloat(e.target.value) || 0)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>שם השלב</div>
                        <input value={ph.name} onChange={e => updatePhase(openProj.id, ph.id, "name", e.target.value)}
                          style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>הערות</div>
                      <input value={ph.notes} onChange={e => updatePhase(openProj.id, ph.id, "notes", e.target.value)}
                        placeholder="הערות על שלב זה..." style={{ width: "100%", padding: "7px 9px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit" }} />
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <button onClick={() => setEditPhaseId(null)} style={{ background: OK, color: WHITE, border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✓ שמור שלב</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ padding: "10px 16px", background: SURF, display: "flex", gap: 8, alignItems: "center" }}>
            <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addPhase(openProj.id)}
              placeholder="שם שלב חדש..."
              style={{ flex: 1, padding: "7px 10px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none" }} />
            <button onClick={() => addPhase(openProj.id)}
              style={{ background: NAVY, color: WHITE, border: "none", borderRadius: 7, padding: "7px 14px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ הוסף שלב</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => {
            setProjects((prev: Project[]) => prev.map(p => p.id === openProj.id ? { ...p, status: "completed", progress: 100 } : p));
            setOpenId(null);
          }} variant="secondary">✓ סמן כהושלם</Btn>
          <Btn onClick={() => { if (window.confirm("למחוק פרויקט זה?")) { setProjects((ps: Project[]) => ps.filter(x => x.id !== openProj.id)); setOpenId(null); } }} variant="danger">🗑 מחק פרויקט</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%" }}>
      {modal && (
        <Modal title="📁 פרויקט חדש" onClose={() => setModal(false)}>
          <FormRow>
            <Field label="שם פרויקט *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="שם הפרויקט" style={{ width: "100%" }} /></Field>
            <Field label="לקוח">
              <Select value={form.clientId} onChange={v => setForm(p => ({ ...p, clientId: v }))} options={[{ value: "", label: "-- בחר לקוח --" }, ...clients.map((c: any) => ({ value: String(c.id), label: c.name }))]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}><Field label="תיאור"><Input value={form.desc} onChange={v => setForm(p => ({ ...p, desc: v }))} placeholder="תיאור הפרויקט" style={{ width: "100%" }} /></Field></div>
          <FormRow>
            <Field label="סטטוס">
              <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={[{ value: "planning", label: "תכנון" }, { value: "active", label: "פעיל" }, { value: "paused", label: "מושהה" }, { value: "completed", label: "הושלם" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="עדיפות">
              <Select value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v }))} options={[{ value: "high", label: "🔴 גבוהה" }, { value: "medium", label: "🟡 בינונית" }, { value: "low", label: "🟢 נמוכה" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תקציב (₪)"><Input value={form.budget} onChange={v => setForm(p => ({ ...p, budget: v }))} type="number" placeholder="80000" style={{ width: "100%" }} /></Field>
            <Field label="נציג אחראי">
              <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={["מיכל כהן", "ירון לוי", "אייל נחמני"].map(x => ({ value: x, label: x }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תאריך התחלה"><Input value={form.startDate} onChange={v => setForm(p => ({ ...p, startDate: v }))} type="date" style={{ width: "100%" }} /></Field>
            <Field label="תאריך סיום"><Input value={form.endDate} onChange={v => setForm(p => ({ ...p, endDate: v }))} type="date" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}><Field label="תגיות (מופרד בפסיקים)"><Input value={form.tags} onChange={v => setForm(p => ({ ...p, tags: v }))} placeholder="CRM, טכנולוגיה" style={{ width: "100%" }} /></Field></div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={save}>✓ צור פרויקט</Btn><Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📁 פרויקטים</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{projects.length} פרויקטים · לחץ על פרויקט לצפייה מלאה</div>
        </div>
        <Btn onClick={() => setModal(true)}>+ פרויקט חדש</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="סה״כ" value={projects.length} color={NAVY} />
        <Stat label="פעילים" value={projects.filter((p: Project) => p.status === "active").length} color={OK} />
        <Stat label="בתכנון" value={projects.filter((p: Project) => p.status === "planning").length} color={BLUE} />
        <Stat label="הושלמו" value={projects.filter((p: Project) => p.status === "completed").length} color={MUTED} />
      </div>

      {projects.map((p: Project) => {
        const cl  = clients.find((c: any) => c.id === p.clientId) || { name: "—" };
        const sc  = STATUS_COLOR[p.status] || MUTED;
        const pct = Math.round((p.spent || 0) / Math.max(p.budget || 1, 1) * 100);
        const phases = p.phases || [];
        const donePhases = phases.filter((ph: ProjectPhase) => ph.status === "done").length;
        return (
          <div key={p.id} onClick={() => setOpenId(p.id)}
            style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, borderRight: `4px solid ${sc}`, cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,.07)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{cl.name} · {p.assignee}</div>
                <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                  <span style={{ background: sc + "22", color: sc, padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{STATUS_LABEL[p.status]}</span>
                  <span style={{ background: PRIO_COLOR[p.priority] + "22", color: PRIO_COLOR[p.priority], padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{PRIO_LABEL[p.priority]}</span>
                  {(p.tags || []).map((t: string, i: number) => <span key={i} style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600 }}>{t}</span>)}
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>תקציב: {fmt(p.budget)}</div>
                <div style={{ fontSize: 11, color: pct > 90 ? ERR : OK }}>בוצע: {fmt(p.spent)} ({pct}%)</div>
                {phases.length > 0 && <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>{donePhases}/{phases.length} שלבים ✓</div>}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600, marginBottom: 4 }}>
                <span>התקדמות</span><span style={{ color: sc }}>{p.progress}%</span>
              </div>
              <div style={{ height: 6, background: BORDER, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${p.progress}%`, height: "100%", background: sc, borderRadius: 3 }} />
              </div>
            </div>

            {phases.length > 0 && (
              <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
                {phases.map((ph: ProjectPhase) => (
                  <div key={ph.id} title={ph.name + " — " + PHASE_LABEL[ph.status]}
                    style={{ flex: 1, height: 6, borderRadius: 3, background: PHASE_COLOR[ph.status] || MUTED }} />
                ))}
              </div>
            )}

            {p.startDate && <div style={{ fontSize: 10, color: MUTED, marginTop: 8 }}>{p.startDate} → {p.endDate || "—"} · לחץ לפרטים מלאים →</div>}
          </div>
        );
      })}
    </div>
  );
}
