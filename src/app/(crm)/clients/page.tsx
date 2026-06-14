"use client";

import { useState, useEffect, useCallback } from "react";
import { Av, Stat, Input, Btn, Select, Modal, FormRow, Field } from "@/components/ui";
import { fetchClients, fetchClient, updateClient, createClient, deleteClient, fetchActiveUsers, type CrmClientRow } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { NAVY, GOLD, GOLD_L, WHITE, MUTED, TEXT, BORDER, OK, ERR, SURF } from "@/lib/tokens";

type Named = { id: number; name: string };
const emptyEdit = { name: "", industry: "", email: "", phone: "", address: "", website: "", status: "", assigneeId: "", notes: "" };

export default function ClientsPage() {
  const { isAdmin } = useApp();
  const [rows, setRows] = useState<CrmClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<CrmClientRow | null>(null);
  const [users, setUsers] = useState<Named[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editForm, setEditForm] = useState(emptyEdit);
  const [editErr, setEditErr] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (p: number, query: string, append: boolean) => {
    setLoading(true); setErr("");
    try {
      const res = await fetchClients({ page: p, q: query, limit: 60 });
      setTotal(res.total); setPage(res.page);
      setRows(prev => (append ? [...prev, ...res.data] : res.data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "טעינת הלקוחות נכשלה");
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

  const openCreate = () => {
    setCreating(true);
    setEditId(null);
    setEditForm(emptyEdit);
    setEditErr("");
  };

  const openEdit = async (c: CrmClientRow) => {
    setCreating(false);
    setEditId(c.id);
    setEditErr("");
    // Show the row data immediately so the modal isn't blank…
    setEditForm({
      name: c.name, industry: c.industry ?? "", email: c.email ?? "", phone: c.phone ?? "",
      address: "", website: "", status: c.status ?? "", assigneeId: c.assignee ? String(c.assignee.id) : "", notes: "",
    });
    // …then hydrate address/website/notes from the full record. The list payload
    // omits them, and saving without them would wipe those columns.
    try {
      const full = await fetchClient(c.id);
      setEditForm(p => ({
        ...p,
        industry: full.industry ?? "", email: full.email ?? "", phone: full.phone ?? "",
        address: full.address ?? "", website: full.website ?? "", status: full.status ?? "",
        assigneeId: full.assigneeId ? String(full.assigneeId) : "", notes: full.notes ?? "",
      }));
    } catch {
      /* keep the row-based prefill — still better than blank fields */
    }
  };

  const closeModal = () => { setEditId(null); setCreating(false); };

  const remove = async (c: CrmClientRow) => {
    if (!window.confirm(`למחוק את הלקוח «${c.name}»? פעולה זו אינה הפיכה.`)) return;
    const res = await deleteClient(c.id);
    if (!res.ok) { alert(res.message ?? "מחיקת הלקוח נכשלה"); return; }
    setSelected(null);
    load(1, q, false);
  };

  const save = async () => {
    if (!editForm.name) { setEditErr("שם הוא שדה חובה"); return; }
    setSaving(true); setEditErr("");
    const status = editForm.status === "active" || editForm.status === "prospect" ? editForm.status : undefined;
    const assigneeId = editForm.assigneeId ? Number(editForm.assigneeId) : undefined;
    const res = creating
      ? await createClient({
          name: editForm.name,
          industry: editForm.industry || undefined,
          email: editForm.email || undefined,
          phone: editForm.phone || undefined,
          address: editForm.address || undefined,
          website: editForm.website || undefined,
          status, assigneeId,
          notes: editForm.notes || undefined,
        })
      : await updateClient(editId!, {
          name: editForm.name,
          industry: editForm.industry || undefined,
          email: editForm.email || null,
          phone: editForm.phone || null,
          address: editForm.address || null,
          website: editForm.website || null,
          ...(status ? { status } : {}),
          ...(assigneeId ? { assigneeId } : {}),
          notes: editForm.notes || null,
        });
    setSaving(false);
    if (!res.ok) { setEditErr(res.message ?? "השמירה נכשלה"); return; }
    closeModal();
    load(1, q, false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      {(editId !== null || creating) && (
        <Modal title={creating ? "➕ לקוח חדש" : "✎ עריכת לקוח"} onClose={closeModal} width={560}>
          <FormRow>
            <Field label="שם חברה *"><Input value={editForm.name} onChange={v => setEditForm(p => ({ ...p, name: v }))} style={{ width: "100%" }} /></Field>
            <Field label="תעשייה"><Input value={editForm.industry} onChange={v => setEditForm(p => ({ ...p, industry: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={editForm.email} onChange={v => setEditForm(p => ({ ...p, email: v }))} style={{ width: "100%" }} /></Field>
            <Field label="טלפון"><Input value={editForm.phone} onChange={v => setEditForm(p => ({ ...p, phone: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="כתובת"><Input value={editForm.address} onChange={v => setEditForm(p => ({ ...p, address: v }))} style={{ width: "100%" }} /></Field>
            <Field label="אתר"><Input value={editForm.website} onChange={v => setEditForm(p => ({ ...p, website: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="סטטוס">
              <Select value={editForm.status} onChange={v => setEditForm(p => ({ ...p, status: v }))} options={[{ value: "", label: "— ללא —" }, { value: "active", label: "פעיל" }, { value: "prospect", label: "מתעניין" }]} style={{ width: "100%" }} />
            </Field>
            <Field label="מנהל לקוח">
              <Select value={editForm.assigneeId} onChange={v => setEditForm(p => ({ ...p, assigneeId: v }))} options={[{ value: "", label: "— ללא —" }, ...users.map(u => ({ value: String(u.id), label: u.name }))]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="הערות">
              <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} style={{ width: "100%", padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, resize: "vertical", minHeight: 50, outline: "none", fontFamily: "inherit" }} />
            </Field>
          </div>
          {editErr && <div style={{ fontSize: 12, color: ERR, marginBottom: 10 }}>{editErr}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : creating ? "➕ צור לקוח" : "✓ שמור"}</Btn>
            <Btn onClick={closeModal} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🏢 לקוחות</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{total.toLocaleString()} לקוחות · מוצגים {rows.length}</div>
          </div>
          <Btn onClick={openCreate}>+ לקוח חדש</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ לקוחות" value={total.toLocaleString()} color={NAVY} />
          <Stat label="עם פרויקטים" value={`${rows.filter(c => c.projectCount > 0).length} / ${rows.length}`} sub="מתוך המוצגים" color={OK} />
          <Stat label="עם אנשי קשר" value={`${rows.filter(c => c.contactCount > 0).length} / ${rows.length}`} sub="מתוך המוצגים" color={GOLD} />
        </div>

        <Input value={q} onChange={setQ} placeholder="🔍 חיפוש לקוח לפי שם / תעשייה / מייל..." style={{ width: "100%", marginBottom: 12 }} />

        {err && <div style={{ textAlign: "center", padding: 24, color: ERR, fontSize: 12 }}>⚠ {err} <button onClick={() => load(1, q, false)} style={{ marginRight: 8, textDecoration: "underline", background: "none", border: "none", color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>נסה שוב</button></div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {rows.map(c => (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{ background: selected?.id === c.id ? GOLD_L : WHITE, border: `1px solid ${selected?.id === c.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer", position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                style={{ position: "absolute", top: 10, left: 10, fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: NAVY, fontFamily: "inherit" }}>✎ ערוך</button>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <Av name={c.name} size={38} color={NAVY} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{c.industry || "—"}{c.assignee ? ` · ${c.assignee.name}` : ""}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: NAVY }}>{c.projectCount}</div><div style={{ fontSize: 9, color: MUTED }}>פרויקטים</div></div>
                <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: GOLD }}>{c.contactCount}</div><div style={{ fontSize: 9, color: MUTED }}>אנשי קשר</div></div>
                <div style={{ background: SURF, borderRadius: 6, padding: "6px 0", textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 800, color: OK }}>{c.dealCount}</div><div style={{ fontSize: 9, color: MUTED }}>עסקאות</div></div>
              </div>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: "center", padding: 20, color: MUTED, fontSize: 12 }}>טוען…</div>}
        {!loading && rows.length === 0 && !err && <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>לא נמצאו לקוחות</div>}
        {!loading && canLoadMore && (
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={() => load(page + 1, q, true)} style={{ padding: "8px 20px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>
              טען עוד ({(total - rows.length).toLocaleString()} נותרו)
            </button>
          </div>
        )}
      </div>

      {selected && (
        <div style={{ width: 280, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, overflowY: "auto", flexShrink: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <Av name={selected.name} size={48} color={NAVY} />
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, marginTop: 8 }}>{selected.name}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{selected.industry || "—"}</div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              <button onClick={() => openEdit(selected)} style={{ fontSize: 11, padding: "4px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: NAVY, fontFamily: "inherit" }}>✎ ערוך פרטים</button>
              {isAdmin && <button onClick={() => remove(selected)} style={{ fontSize: 11, padding: "4px 12px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: ERR, fontFamily: "inherit" }}>🗑 מחק</button>}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>פרטים</div>
            {selected.email && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>✉ {selected.email}</div>}
            {selected.phone && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📞 {selected.phone}</div>}
            <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>👤 מנהל לקוח: {selected.assignee?.name || "—"}</div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[["פרויקטים", selected.projectCount], ["אנשי קשר", selected.contactCount], ["עסקאות", selected.dealCount]].map(([l, v]) => (
              <div key={l as string} style={{ background: SURF, borderRadius: 6, padding: "8px 0", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: NAVY }}>{v as number}</div>
                <div style={{ fontSize: 9, color: MUTED }}>{l as string}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
