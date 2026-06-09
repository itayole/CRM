"use client";

import { useState, useEffect } from "react";
import { Stat, Btn, Input, Select, Modal, FormRow, Field, PageShell } from "@/components/ui";
import { fetchTasks, createTask, updateTask, deleteTask, type CrmTask } from "@/lib/api";
import { NAVY, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";

const ICONS: Record<string, string> = { call: "📞", email: "✉", meeting: "🤝", proposal: "📋", followup: "🔁", other: "📌" };
const PRIO: Record<string, { label: string; color: string }> = {
  high:   { label: "🔴 גבוהה",   color: ERR },
  medium: { label: "🟡 בינונית", color: WARN },
  low:    { label: "🟢 נמוכה",   color: OK },
};

const emptyForm = { desc: "", type: "call", priority: "medium" as const, date: "", time: "09:00", client: "", notes: "" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch(e => setErr(e instanceof Error ? e.message : "טעינת המשימות נכשלה"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!form.desc || !form.date) { alert("תיאור ותאריך הם שדות חובה"); return; }
    setSaving(true);
    const res = await createTask({
      desc: form.desc, type: form.type, priority: form.priority,
      date: form.date, time: form.time || null, client: form.client || null, notes: form.notes || null,
    });
    setSaving(false);
    if (!res.ok || !res.task) { alert(res.message || "שמירת המשימה נכשלה"); return; }
    setTasks(p => [res.task!, ...p]);
    setModal(false);
    setForm({ ...emptyForm });
  };

  const toggle = async (t: CrmTask) => {
    const next = t.status === "done" ? "open" : "done";
    setTasks(p => p.map(x => x.id === t.id ? { ...x, status: next } : x)); // optimistic
    const res = await updateTask(t.id, { status: next });
    if (!res.ok) {
      setTasks(p => p.map(x => x.id === t.id ? { ...x, status: t.status } : x)); // revert
      alert(res.message || "עדכון המשימה נכשל");
    }
  };

  const remove = async (t: CrmTask) => {
    const prev = tasks;
    setTasks(p => p.filter(x => x.id !== t.id)); // optimistic
    const res = await deleteTask(t.id);
    if (!res.ok) { setTasks(prev); alert(res.message || "מחיקת המשימה נכשלה"); }
  };

  const filtered = tasks.filter(t => {
    if (filter === "open")    return t.status === "open";
    if (filter === "done")    return t.status === "done";
    if (filter === "today")   return t.status === "open" && t.date === today;
    if (filter === "overdue") return t.status === "open" && !!t.date && t.date < today;
    return true;
  });

  const stats = {
    total:   tasks.length,
    open:    tasks.filter(t => t.status === "open").length,
    done:    tasks.filter(t => t.status === "done").length,
    today:   tasks.filter(t => t.status === "open" && t.date === today).length,
    overdue: tasks.filter(t => t.status === "open" && !!t.date && t.date < today).length,
  };

  return (
    <PageShell>
      {modal && (
        <Modal title="✅ משימה חדשה" onClose={() => setModal(false)}>
          <div style={{ marginBottom: 10 }}>
            <Field label="תיאור *"><Input value={form.desc} onChange={v => setForm(p => ({ ...p, desc: v }))} placeholder="תאר את המשימה..." style={{ width: "100%" }} /></Field>
          </div>
          <FormRow>
            <Field label="סוג">
              <Select value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={[{ value: "call", label: "📞 שיחה" }, { value: "email", label: "✉ מייל" }, { value: "meeting", label: "🤝 פגישה" }, { value: "proposal", label: "📋 הצעה" }, { value: "followup", label: "🔁 Follow-up" }, { value: "other", label: "📌 אחר" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="עדיפות">
              <Select value={form.priority} onChange={v => setForm(p => ({ ...p, priority: v as typeof p.priority }))} options={[{ value: "high", label: "🔴 גבוהה" }, { value: "medium", label: "🟡 בינונית" }, { value: "low", label: "🟢 נמוכה" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תאריך *"><Input value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" style={{ width: "100%" }} /></Field>
            <Field label="שעה"><Input value={form.time} onChange={v => setForm(p => ({ ...p, time: v }))} type="time" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="לקוח"><Input value={form.client} onChange={v => setForm(p => ({ ...p, client: v }))} placeholder="שם הלקוח" style={{ width: "100%" }} /></Field>
            <Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות..." style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : "✓ שמור"}</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>✅ מנהל משימות</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{stats.open} פתוחות · {stats.done} הושלמו</div>
        </div>
        <Btn onClick={() => setModal(true)}>+ משימה חדשה</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 12 }}>
        <Stat label="סה״כ"    value={stats.total}   color={NAVY} />
        <Stat label="פתוחות"  value={stats.open}    color="#1E3A6E" />
        <Stat label="היום"    value={stats.today}   color={WARN} />
        <Stat label="באיחור"  value={stats.overdue} color={ERR} />
        <Stat label="הושלמו"  value={stats.done}    color={OK} />
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {(["all", "open", "today", "overdue", "done"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "6px 11px", borderRadius: 6, border: `1px solid ${filter === f ? NAVY : BORDER}`, background: filter === f ? NAVY : WHITE, color: filter === f ? WHITE : TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            {{ all: "הכל", open: "פתוחות", today: "היום", overdue: "באיחור", done: "הושלמו" }[f]}
          </button>
        ))}
      </div>

      {err && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>⚠ {err}</div>}
      {loading && <div style={{ textAlign: "center", padding: 32, color: MUTED }}>טוען משימות…</div>}
      {!loading && !err && filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: MUTED }}>אין משימות תואמות</div>}

      {filtered.map(t => {
        const pr = PRIO[t.priority] || PRIO.medium;
        const isOver = t.status === "open" && t.date && t.date < today;
        const isToday = t.date === today;
        return (
          <div key={t.id} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 12, marginBottom: 8, borderRight: `4px solid ${t.status === "done" ? BORDER : pr.color}` }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div onClick={() => toggle(t)}
                style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.status === "done" ? OK : BORDER}`, background: t.status === "done" ? OK : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginTop: 1 }}>
                {t.status === "done" && <span style={{ color: WHITE, fontSize: 10 }}>✓</span>}
              </div>
              <div style={{ flex: 1, opacity: t.status === "done" ? 0.55 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{ICONS[t.type || "other"] || "📌"}</span>
                  <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, textDecoration: t.status === "done" ? "line-through" : "none" }}>{t.desc}</div>
                </div>
                {t.client && <div style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>🏢 {t.client}</div>}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: isOver ? "#FDECEC" : isToday ? "#FEF3DC" : "transparent", color: isOver ? ERR : isToday ? WARN : MUTED, padding: "2px 6px", borderRadius: 4 }}>
                    📅 {t.date}{t.time ? " " + t.time : ""}{isOver ? " — באיחור" : isToday ? " — היום" : ""}
                  </span>
                  <span style={{ fontSize: 11, color: pr.color, fontWeight: 600 }}>{pr.label}</span>
                  {t.notes && <span style={{ fontSize: 10, color: MUTED }}>📝 {t.notes}</span>}
                </div>
              </div>
              <button onClick={() => remove(t)}
                style={{ fontSize: 10, padding: "3px 6px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, flexShrink: 0, fontFamily: "inherit" }}>🗑</button>
            </div>
          </div>
        );
      })}
    </PageShell>
  );
}
