"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Stat, Btn, Input, Select, Modal, FormRow, Field, PageShell } from "@/components/ui";
import { fetchUsers, createUser, updateUser, deleteUser, type CrmUser } from "@/lib/api";
import { ROLES, roleLabel, isAdminRole } from "@/lib/roles";
import { NAVY, GOLD, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";

const emptyForm = { name: "", email: "", role: "sales_rep" as "admin" | "sales_rep", active: true, password: "" };

export default function UsersPage() {
  const { currentUser } = useApp();
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState(emptyForm);

  const reload = useCallback(async () => {
    setLoading(true); setLoadErr("");
    try { setUsers(await fetchUsers()); }
    catch (e) { setLoadErr(e instanceof Error ? e.message : "טעינת המשתמשים נכשלה"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const save = async () => {
    if (!form.name || !form.email) { setFormErr("שם ומייל הם שדות חובה"); return; }
    if (form.password && form.password.length < 6) { setFormErr("סיסמה חייבת להיות באורך 6 תווים לפחות"); return; }
    setSaving(true); setFormErr("");
    const res = await createUser({
      name: form.name,
      email: form.email,
      role: form.role,
      active: form.active,
      password: form.password || undefined,
    });
    setSaving(false);
    if (!res.ok) { setFormErr(res.message ?? "שמירה נכשלה"); return; }
    setModal(false); setForm(emptyForm); reload();
  };

  const toggleActive = async (u: CrmUser) => {
    const res = await updateUser(u.id, { active: !u.active });
    if (!res.ok) { alert(res.message); return; }
    reload();
  };

  const changeRole = async (u: CrmUser, role: "admin" | "sales_rep") => {
    const res = await updateUser(u.id, { role });
    if (!res.ok) { alert(res.message); return; }
    reload();
  };

  const remove = async (u: CrmUser) => {
    if (!window.confirm(`למחוק את ${u.name}?`)) return;
    const res = await deleteUser(u.id);
    if (!res.ok) { alert(res.message); return; }
    reload();
  };

  const adminCount = users.filter(u => isAdminRole(u.role)).length;

  return (
    <PageShell>
      {modal && (
        <Modal title="👤 משתמש חדש" onClose={() => { setModal(false); setForm(emptyForm); setFormErr(""); }}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="ישראל ישראלי" style={{ width: "100%" }} /></Field>
            <Field label="מייל / שם משתמש *"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="user@shiluv.co.il" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="תפקיד">
              <Select value={form.role} onChange={v => setForm(p => ({ ...p, role: v as "admin" | "sales_rep" }))} options={ROLES.map(r => ({ value: r.value, label: r.label }))} style={{ width: "100%" }} />
            </Field>
            <Field label="סטטוס">
              <Select value={form.active ? "true" : "false"} onChange={v => setForm(p => ({ ...p, active: v === "true" }))} options={[{ value: "true", label: "פעיל" }, { value: "false", label: "לא פעיל" }]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="סיסמה מקומית (אופציונלי)">
              <Input value={form.password} onChange={v => setForm(p => ({ ...p, password: v }))} placeholder="השאירו ריק להתחברות AD בלבד" type="password" style={{ width: "100%" }} />
            </Field>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>אם תשאירו ריק — המשתמש יתחבר דרך Active Directory בלבד.</div>
          </div>
          {formErr && <div style={{ fontSize: 12, color: ERR, marginBottom: 10 }}>{formErr}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : "✓ הוסף"}</Btn>
            <Btn onClick={() => { setModal(false); setForm(emptyForm); setFormErr(""); }} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>⚙ ניהול משתמשים</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{users.length} משתמשים</div>
        </div>
        <Btn onClick={() => { setForm(emptyForm); setFormErr(""); setModal(true); }}>+ משתמש חדש</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
        <Stat label="סה״כ" value={users.length} color={NAVY} />
        <Stat label="פעילים" value={users.filter(u => u.active).length} color={OK} />
        <Stat label="מנהלים" value={adminCount} color={NAVY} />
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        {loading && <div style={{ padding: 28, textAlign: "center", color: MUTED, fontSize: 12 }}>טוען משתמשים…</div>}
        {!loading && loadErr && <div style={{ padding: 28, textAlign: "center", color: ERR, fontSize: 12 }}>⚠ {loadErr} <button onClick={reload} style={{ marginRight: 8, textDecoration: "underline", background: "none", border: "none", color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>נסה שוב</button></div>}
        {!loading && !loadErr && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: SURF }}>
                {["משתמש", "מייל", "תפקיד", "כניסה אחרונה", "הצטרף", "סטטוס", "פעולות"].map(hd => (
                  <th key={hd} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 11 }}>{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const isSelf = u.id === currentUser?.id;
                const admin = isAdminRole(u.role);
                return (
                  <tr key={u.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <Av name={u.name} size={28} color={admin ? GOLD : NAVY} />
                        <div style={{ fontWeight: 700, color: TEXT, fontSize: 12 }}>{u.name}{admin ? " 👑" : ""}{isSelf ? " (אני)" : ""}</div>
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.email}</td>
                    <td style={{ padding: "9px 12px" }}>
                      {isSelf ? (
                        <span style={{ background: NAVY + "22", color: NAVY, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{roleLabel(u.role)}</span>
                      ) : (
                        <Select value={u.role} onChange={v => changeRole(u, v as "admin" | "sales_rep")} options={ROLES.map(r => ({ value: r.value, label: r.label }))} style={{ fontSize: 11, padding: "3px 6px" }} />
                      )}
                    </td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.lastLogin ? u.lastLogin.slice(0, 10) : "—"}</td>
                    <td style={{ padding: "9px 12px", fontSize: 11, color: MUTED }}>{u.joined ? u.joined.slice(0, 10) : "—"}</td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.active ? OK : BORDER }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: u.active ? OK : MUTED }}>{u.active ? "פעיל" : "לא פעיל"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "9px 12px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        {!isSelf && (
                          <button onClick={() => toggleActive(u)}
                            style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: u.active ? WARN : OK, fontFamily: "inherit" }}>
                            {u.active ? "⏸ השבת" : "▶ הפעל"}
                          </button>
                        )}
                        {!isSelf && (
                          <button onClick={() => remove(u)}
                            style={{ fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑</button>
                        )}
                        {isSelf && <span style={{ fontSize: 10, color: MUTED }}>—</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 12 }}>אין משתמשים</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
