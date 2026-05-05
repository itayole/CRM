"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Av, Stat, Btn, Input, Select, Modal, FormRow, Field, PageShell } from "@/components/ui";
import { NAVY, GOLD, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";

const MAX = 20;

export default function UsersPage() {
  const { users, setUsers, currentUser, startImpersonate } = useApp();
  const router = useRouter();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "נציג מכירות", active: true });

  const save = () => {
    if (!form.name || !form.email) { alert("שם ומייל הם שדות חובה"); return; }
    if (users.some(u => u.email.toLowerCase() === form.email.toLowerCase())) { alert("מייל כבר קיים במערכת"); return; }
    if (users.length >= MAX) { alert("הגעת למקסימום " + MAX + " משתמשים"); return; }
    setUsers(p => [...p, { ...form, id: Date.now(), joined: new Date().toISOString().slice(0, 10), lastLogin: null }]);
    setModal(false);
    setForm({ name: "", email: "", role: "נציג מכירות", active: true });
  };

  const handleImpersonate = (user: typeof users[0]) => {
    startImpersonate(user);
    router.push("/dashboard");
  };

  return (
    <PageShell>
      {modal && (
        <Modal title="👤 משתמש חדש" onClose={() => setModal(false)}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="מייל *"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="user@co.il" type="email" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="תפקיד">
              <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} options={[{ value: "נציג מכירות", label: "נציג מכירות" }, { value: "מנהל מערכת", label: "מנהל מערכת" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="סטטוס">
              <Select value={form.active ? "true" : "false"} onChange={v => setForm(p => ({ ...p, active: v === "true" }))} options={[{ value: "true", label: "פעיל" }, { value: "false", label: "לא פעיל" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save}>✓ הוסף</Btn>
            <Btn onClick={() => setModal(false)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>⚙ ניהול משתמשים</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{users.length} / {MAX} משתמשים</div>
        </div>
        {users.length < MAX
          ? <Btn onClick={() => setModal(true)}>+ משתמש חדש</Btn>
          : <span style={{ fontSize: 11, color: ERR, background: "#FDECEC", padding: "6px 12px", borderRadius: 7, fontWeight: 600 }}>הגעת למקסימום</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="סה״כ"     value={`${users.length} / ${MAX}`} color={NAVY} />
        <Stat label="פעילים"   value={users.filter(u => u.active).length} color={OK} />
        <Stat label="מנהלים"   value={users.filter(u => u.role === "מנהל מערכת").length} color={NAVY} />
        <Stat label="מושבתים"  value={users.filter(u => !u.active).length} color={MUTED} />
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: SURF }}>
              {["משתמש", "מייל", "תפקיד", "כניסה", "הצטרף", "סטטוס", "פעולות"].map(hd => (
                <th key={hd} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 11 }}>{hd}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <Av name={u.name} size={28} color={u.role === "מנהל מערכת" ? GOLD : NAVY} />
                    <div style={{ fontWeight: 700, color: TEXT, fontSize: 12 }}>{u.name}{u.role === "מנהל מערכת" ? " 👑" : ""}</div>
                  </div>
                </td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.email}</td>
                <td style={{ padding: "9px 12px" }}>
                  <span style={{ background: NAVY + "22", color: NAVY, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{u.role}</span>
                </td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.lastLogin || "—"}</td>
                <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.joined}</td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.active ? OK : BORDER }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? OK : MUTED }}>{u.active ? "פעיל" : "לא פעיל"}</span>
                  </div>
                </td>
                <td style={{ padding: "9px 12px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleImpersonate(u)} style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: BLUE, fontFamily: "inherit" }}>👁 צפה כ</button>
                    )}
                    {u.id !== currentUser?.id && (
                      <button onClick={() => setUsers(p => p.map(x => x.id === u.id ? { ...x, active: !x.active } : x))}
                        style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: u.active ? WARN : OK, fontFamily: "inherit" }}>
                        {u.active ? "⏸ השבת" : "▶ הפעל"}
                      </button>
                    )}
                    {u.id !== currentUser?.id && (
                      <button onClick={() => { if (window.confirm("למחוק?")) setUsers(p => p.filter(x => x.id !== u.id)); }}
                        style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
