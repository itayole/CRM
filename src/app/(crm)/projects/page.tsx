"use client";

import { useState, useEffect, useCallback } from "react";
import { Stat, Input, Btn, Select, Modal, FormRow, Field } from "@/components/ui";
import { fetchProjects, updateProject, createProject, fetchClients, fetchActiveUsers, type CrmProjectRow } from "@/lib/api";
import { fmt } from "@/lib/utils";
import { NAVY, GOLD, WHITE, MUTED, TEXT, BORDER, OK, SURF, ERR } from "@/lib/tokens";

type Named = { id: number; name: string };
const d10 = (s: string | null) => (s ? String(s).slice(0, 10) : "—");
const emptyEdit = { name: "", statusText: "", methodology: "", model: "", billing: "", assigneeId: "", clientId: "", clientName: "" };

export default function ProjectsPage() {
  const [rows, setRows] = useState<CrmProjectRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<CrmProjectRow | null>(null);
  const [users, setUsers] = useState<Named[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Named[]>([]);

  const load = useCallback(async (p: number, query: string, append: boolean) => {
    setLoading(true); setErr("");
    try {
      const res = await fetchProjects({ page: p, q: query, limit: 60 });
      setTotal(res.total); setPage(res.page);
      setRows(prev => (append ? [...prev, ...res.data] : res.data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "טעינת הפרויקטים נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActiveUsers().then(setUsers); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(1, q, false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  const canLoadMore = rows.length < total;
  const billingShown = rows.reduce((s, p) => s + (p.billing ?? 0), 0);

  // Debounced client search for linking a new project to an existing client.
  useEffect(() => {
    if (!clientQuery) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await fetchClients({ q: clientQuery, limit: 8 }); setClientResults(r.data.map(c => ({ id: c.id, name: c.name }))); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const openCreate = () => {
    setCreating(true);
    setEditId(null);
    setEditForm(emptyEdit);
    setClientQuery(""); setClientResults([]);
    setEditErr("");
  };

  const openEdit = (p: CrmProjectRow) => {
    setCreating(false);
    setEditId(p.id);
    setEditForm({
      ...emptyEdit,
      name: p.name, statusText: p.statusText ?? "", methodology: p.methodology ?? "",
      model: p.model ?? "", billing: p.billing != null ? String(p.billing) : "", assigneeId: p.assignee ? String(p.assignee.id) : "",
    });
    setEditErr("");
  };

  const closeModal = () => { setEditId(null); setCreating(false); };

  const save = async () => {
    if (!editForm.name) { setEditErr("שם פרויקט הוא שדה חובה"); return; }
    setSaving(true); setEditErr("");
    const res = creating
      ? await createProject({
          name: editForm.name,
          clientId: editForm.clientId ? Number(editForm.clientId) : undefined,
          assigneeId: editForm.assigneeId ? Number(editForm.assigneeId) : undefined,
          model: editForm.model || undefined,
          methodology: editForm.methodology || undefined,
          statusText: editForm.statusText || undefined,
          billing: editForm.billing ? Number(editForm.billing) : undefined,
        })
      : await updateProject(editId!, {
          name: editForm.name,
          statusText: editForm.statusText || null,
          methodology: editForm.methodology || null,
          model: editForm.model || null,
          billing: editForm.billing ? Number(editForm.billing) : null,
          assigneeId: editForm.assigneeId ? Number(editForm.assigneeId) : null,
        });
    setSaving(false);
    if (!res.ok) { setEditErr(res.message ?? "השמירה נכשלה"); return; }
    closeModal(); setSel(null);
    load(1, q, false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      {(editId !== null || creating) && (
        <Modal title={creating ? "➕ פרויקט חדש" : "✎ עריכת פרויקט"} onClose={closeModal} width={560}>
          <div style={{ marginBottom: 10 }}>
            <Field label="שם פרויקט *"><Input value={editForm.name} onChange={v => setEditForm(p => ({ ...p, name: v }))} style={{ width: "100%" }} /></Field>
          </div>
          {creating && (
            <div style={{ marginBottom: 10 }}>
              <Field label="לקוח (אופציונלי)">
                {editForm.clientId ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ background: "#E6F1FB", color: NAVY, padding: "4px 10px", borderRadius: 7, fontWeight: 700 }}>🏢 {editForm.clientName}</span>
                    <button onClick={() => setEditForm(p => ({ ...p, clientId: "", clientName: "" }))} style={{ fontSize: 11, background: "none", border: "none", color: ERR, cursor: "pointer", fontFamily: "inherit" }}>נתק</button>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
                    <Input value={clientQuery} onChange={setClientQuery} placeholder="הקלד שם לקוח לחיפוש וקישור..." style={{ width: "100%" }} />
                    {clientResults.length > 0 && (
                      <div style={{ position: "absolute", zIndex: 10, top: "100%", right: 0, left: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, marginTop: 2, maxHeight: 160, overflowY: "auto", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}>
                        {clientResults.map(c => (
                          <div key={c.id} onClick={() => { setEditForm(p => ({ ...p, clientId: String(c.id), clientName: c.name })); setClientQuery(""); setClientResults([]); }}
                            style={{ padding: "7px 11px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${SURF}` }}>{c.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Field>
            </div>
          )}
          <FormRow>
            <Field label="סטטוס"><Input value={editForm.statusText} onChange={v => setEditForm(p => ({ ...p, statusText: v }))} placeholder="בעבודה / ממתין לאישור..." style={{ width: "100%" }} /></Field>
            <Field label="מתודולוגיה"><Input value={editForm.methodology} onChange={v => setEditForm(p => ({ ...p, methodology: v }))} placeholder="כמותי / איכותני" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מודל"><Input value={editForm.model} onChange={v => setEditForm(p => ({ ...p, model: v }))} style={{ width: "100%" }} /></Field>
            <Field label="חיוב (₪)"><Input value={editForm.billing} onChange={v => setEditForm(p => ({ ...p, billing: v }))} type="number" style={{ width: "100%" }} /></Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="מנהל לקוח / אחראי">
              <Select value={editForm.assigneeId} onChange={v => setEditForm(p => ({ ...p, assigneeId: v }))} options={[{ value: "", label: "— ללא —" }, ...users.map(u => ({ value: String(u.id), label: u.name }))]} style={{ width: "100%" }} />
            </Field>
          </div>
          {editErr && <div style={{ fontSize: 12, color: ERR, marginBottom: 10 }}>{editErr}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : creating ? "➕ צור פרויקט" : "✓ שמור"}</Btn>
            <Btn onClick={closeModal} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📁 פרויקטים</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{total.toLocaleString()} פרויקטים · מוצגים {rows.length}</div>
          </div>
          <Btn onClick={openCreate}>+ פרויקט חדש</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ פרויקטים" value={total.toLocaleString()} color={NAVY} />
          <Stat label="מקושרים ללקוח" value={rows.filter(p => p.client).length} sub="מתוך המוצגים" color={OK} />
          <Stat label="חיוב (מוצגים)" value={fmt(billingShown)} color={GOLD} />
        </div>

        <Input value={q} onChange={setQ} placeholder="🔍 חיפוש פרויקט לפי שם / לקוח / מס׳ שילוב..." style={{ width: "100%", marginBottom: 12 }} />

        {err && <div style={{ textAlign: "center", padding: 24, color: ERR, fontSize: 12 }}>⚠ {err} <button onClick={() => load(1, q, false)} style={{ marginRight: 8, textDecoration: "underline", background: "none", border: "none", color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>נסה שוב</button></div>}

        <div style={{ flex: 1, overflowY: "auto", border: `1px solid ${BORDER}`, borderRadius: 10, background: WHITE }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: SURF, position: "sticky", top: 0 }}>
                {["מס׳", "שם פרויקט", "לקוח", "מתודולוגיה", "סטטוס", "חיוב", "נוצר"].map(h => (
                  <th key={h} style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(p => (
                <tr key={p.id} onClick={() => setSel(sel?.id === p.id ? null : p)}
                  style={{ borderTop: `1px solid ${BORDER}`, cursor: "pointer", background: sel?.id === p.id ? "#F0F4FF" : WHITE }}>
                  <td style={{ padding: "8px 12px", color: MUTED, whiteSpace: "nowrap" }}>{p.projectNo ?? "—"}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: TEXT, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>
                  <td style={{ padding: "8px 12px", color: TEXT }}>
                    {p.client ? p.client.name : <span style={{ color: MUTED }}>{p.clientName || "—"}{p.clientName ? " ⚠" : ""}</span>}
                  </td>
                  <td style={{ padding: "8px 12px", color: MUTED, whiteSpace: "nowrap" }}>{p.methodology || "—"}</td>
                  <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>{p.statusText || p.state || "—"}</td>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: NAVY, whiteSpace: "nowrap" }}>{p.billing != null ? fmt(p.billing) : "—"}</td>
                  <td style={{ padding: "8px 12px", color: MUTED, whiteSpace: "nowrap" }}>{d10(p.sourceCreatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading && <div style={{ textAlign: "center", padding: 20, color: MUTED, fontSize: 12 }}>טוען…</div>}
          {!loading && rows.length === 0 && !err && <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>לא נמצאו פרויקטים</div>}
          {!loading && canLoadMore && (
            <div style={{ textAlign: "center", padding: 14 }}>
              <button onClick={() => load(page + 1, q, true)} style={{ padding: "8px 20px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>
                טען עוד ({(total - rows.length).toLocaleString()} נותרו)
              </button>
            </div>
          )}
        </div>
      </div>

      {sel && (
        <div style={{ width: 300, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: TEXT }}>{sel.name}</div>
            <button onClick={() => setSel(null)} style={{ background: "none", border: "none", fontSize: 16, cursor: "pointer", color: MUTED }}>✕</button>
          </div>
          <button onClick={() => openEdit(sel)} style={{ width: "100%", marginBottom: 10, fontSize: 11, padding: "6px 0", border: `1px solid ${NAVY}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: NAVY, fontWeight: 700, fontFamily: "inherit" }}>✎ ערוך פרטים</button>
          {[
            ["מספר פרויקט", sel.projectNo ?? "—"],
            ["לקוח", sel.client?.name || sel.clientName || "—"],
            ["קישור ללקוח", sel.client ? "מקושר ✓" : "לא מקושר (שם בלבד)"],
            ["מנהל לקוח", sel.assignee?.name || "—"],
            ["מתודולוגיה", sel.methodology || "—"],
            ["מודל", sel.model || "—"],
            ["סטטוס", sel.statusText || "—"],
            ["State", sel.state || "—"],
            ["חיוב", sel.billing != null ? fmt(sel.billing) : "—"],
            ["נוצר", d10(sel.sourceCreatedAt)],
            ["עודכן לאחרונה", d10(sel.lastUpdated)],
          ].map(([label, val]) => (
            <div key={label as string} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "6px 0", borderTop: `1px solid ${BORDER}`, fontSize: 11 }}>
              <span style={{ color: MUTED }}>{label as string}</span>
              <span style={{ color: TEXT, fontWeight: 600, textAlign: "left" }}>{val as string}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
