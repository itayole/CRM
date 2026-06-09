"use client";

import { useState, useEffect, useCallback } from "react";
import { Av, Stat, Input, Btn, Select, Modal, FormRow, Field } from "@/components/ui";
import { fetchContacts, createContact, updateContact, deleteContact, fetchActiveUsers, fetchClients, type CrmContactRow } from "@/lib/api";
import { NAVY, GOLD, GOLD_L, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR, SURF } from "@/lib/tokens";

type Named = { id: number; name: string };
const STATUS = [{ value: "active", label: "פעיל" }, { value: "raw", label: "גולמי" }, { value: "unsubscribed", label: "הוסר" }];
const statusLabel = (s: string | null) => STATUS.find(x => x.value === s)?.label ?? (s || "—");
const statusColor = (s: string | null) => (s === "active" ? OK : s === "unsubscribed" ? ERR : MUTED);
const emptyForm = { fullName: "", firstName: "", email: "", mobile: "", companyName: "", category: "", status: "active", newsletter: false, accountManagerId: "", clientId: "" };

export default function ContactsPage() {
  const [rows, setRows] = useState<CrmContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<CrmContactRow | null>(null);
  const [users, setUsers] = useState<Named[]>([]);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formErr, setFormErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Named[]>([]);

  const load = useCallback(async (p: number, query: string, append: boolean) => {
    setLoading(true); setErr("");
    try {
      const res = await fetchContacts({ page: p, q: query, limit: 60 });
      setTotal(res.total); setPage(res.page);
      setRows(prev => (append ? [...prev, ...res.data] : res.data));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "טעינת אנשי הקשר נכשלה");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActiveUsers().then(setUsers); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(1, q, false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, load]);
  useEffect(() => {
    if (!clientQuery) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await fetchClients({ q: clientQuery, limit: 8 }); setClientResults(r.data.map(c => ({ id: c.id, name: c.name }))); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const canLoadMore = rows.length < total;

  const openCreate = () => { setEditId("new"); setForm(emptyForm); setFormErr(""); setClientQuery(""); };
  const openEdit = (c: CrmContactRow) => {
    setEditId(c.id);
    setForm({
      fullName: c.fullName ?? "", firstName: c.firstName ?? "", email: c.email ?? "", mobile: c.mobile ?? "",
      companyName: c.companyName ?? "", category: c.category ?? "", status: c.status ?? "active", newsletter: c.newsletter,
      accountManagerId: c.accountManager ? String(c.accountManager.id) : "", clientId: c.client ? String(c.client.id) : "",
    });
    setFormErr(""); setClientQuery("");
  };

  const save = async () => {
    if (!form.fullName) { setFormErr("שם מלא הוא שדה חובה"); return; }
    setSaving(true); setFormErr("");
    const payload = {
      fullName: form.fullName,
      firstName: form.firstName || null,
      email: form.email || null,
      mobile: form.mobile || null,
      companyName: form.companyName || null,
      category: form.category || null,
      status: form.status || null,
      newsletter: form.newsletter,
      clientId: form.clientId ? Number(form.clientId) : null,
      accountManagerId: form.accountManagerId ? Number(form.accountManagerId) : null,
    };
    const res = editId === "new"
      ? await createContact({ ...payload, fullName: form.fullName })
      : await updateContact(editId as number, payload);
    setSaving(false);
    if (!res.ok) { setFormErr(res.message ?? "השמירה נכשלה"); return; }
    setEditId(null); setSelected(null); load(1, q, false);
  };

  const remove = async (c: CrmContactRow) => {
    if (!window.confirm(`למחוק את ${c.fullName}?`)) return;
    const res = await deleteContact(c.id);
    if (!res.ok) { alert(res.message); return; }
    setSelected(null); load(1, q, false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      {editId !== null && (
        <Modal title={editId === "new" ? "👤 איש קשר חדש" : "✎ עריכת איש קשר"} onClose={() => setEditId(null)} width={560}>
          <FormRow>
            <Field label="שם מלא *"><Input value={form.fullName} onChange={v => setForm(p => ({ ...p, fullName: v }))} style={{ width: "100%" }} /></Field>
            <Field label="שם פרטי"><Input value={form.firstName} onChange={v => setForm(p => ({ ...p, firstName: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="מייל"><Input value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} style={{ width: "100%" }} /></Field>
            <Field label="נייד"><Input value={form.mobile} onChange={v => setForm(p => ({ ...p, mobile: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="חברה (טקסט)"><Input value={form.companyName} onChange={v => setForm(p => ({ ...p, companyName: v }))} style={{ width: "100%" }} /></Field>
            <Field label="קטגוריה"><Input value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="סטטוס">
              <Select value={form.status} onChange={v => setForm(p => ({ ...p, status: v }))} options={STATUS} style={{ width: "100%" }} />
            </Field>
            <Field label="מנהל לקוח">
              <Select value={form.accountManagerId} onChange={v => setForm(p => ({ ...p, accountManagerId: v }))} options={[{ value: "", label: "— ללא —" }, ...users.map(u => ({ value: String(u.id), label: u.name }))]} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="קישור ללקוח קיים (אופציונלי)">
              {form.clientId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ background: "#E6F1FB", color: NAVY, padding: "4px 10px", borderRadius: 7, fontWeight: 700 }}>🏢 {form.companyName || "מקושר"}</span>
                  <button onClick={() => setForm(p => ({ ...p, clientId: "" }))} style={{ fontSize: 11, background: "none", border: "none", color: ERR, cursor: "pointer", fontFamily: "inherit" }}>נתק</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <Input value={clientQuery} onChange={setClientQuery} placeholder="הקלד שם לקוח לחיפוש וקישור..." style={{ width: "100%" }} />
                  {clientResults.length > 0 && (
                    <div style={{ position: "absolute", zIndex: 10, top: "100%", right: 0, left: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, marginTop: 2, maxHeight: 160, overflowY: "auto", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}>
                      {clientResults.map(c => (
                        <div key={c.id} onClick={() => { setForm(p => ({ ...p, clientId: String(c.id), companyName: p.companyName || c.name })); setClientQuery(""); setClientResults([]); }}
                          style={{ padding: "7px 11px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${SURF}` }}>{c.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={form.newsletter} onChange={e => setForm(p => ({ ...p, newsletter: e.target.checked }))} />
            רשום לדיוור (ניוזלטר)
          </label>
          {formErr && <div style={{ fontSize: 12, color: ERR, marginBottom: 10 }}>{formErr}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : "✓ שמור"}</Btn>
            <Btn onClick={() => setEditId(null)} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>👤 אנשי קשר</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{total.toLocaleString()} אנשי קשר · מוצגים {rows.length}</div>
          </div>
          <Btn onClick={openCreate}>+ איש קשר חדש</Btn>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ אנשי קשר" value={total.toLocaleString()} color={NAVY} />
          <Stat label="מקושרים ללקוח" value={rows.filter(c => c.client).length} sub="מתוך המוצגים" color={OK} />
          <Stat label="רשומים לדיוור" value={rows.filter(c => c.newsletter).length} sub="מתוך המוצגים" color={GOLD} />
        </div>

        <Input value={q} onChange={setQ} placeholder="🔍 חיפוש לפי שם / מייל / חברה..." style={{ width: "100%", marginBottom: 12 }} />

        {err && <div style={{ textAlign: "center", padding: 24, color: ERR, fontSize: 12 }}>⚠ {err} <button onClick={() => load(1, q, false)} style={{ marginRight: 8, textDecoration: "underline", background: "none", border: "none", color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>נסה שוב</button></div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {rows.map(c => (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{ background: selected?.id === c.id ? GOLD_L : WHITE, border: `1px solid ${selected?.id === c.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer", position: "relative" }}>
              <button onClick={e => { e.stopPropagation(); openEdit(c); }}
                style={{ position: "absolute", top: 10, left: 10, fontSize: 10, padding: "3px 7px", border: `1px solid ${BORDER}`, borderRadius: 5, background: WHITE, cursor: "pointer", color: NAVY, fontFamily: "inherit" }}>✎ ערוך</button>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <Av name={c.fullName || "?"} size={36} color={NAVY} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 150 }}>{c.fullName || "—"}</div>
                  <div style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>{c.client?.name || c.companyName || "—"}</div>
                </div>
              </div>
              {c.email && <div style={{ fontSize: 10, color: MUTED, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>✉ {c.email}</div>}
              {c.mobile && <div style={{ fontSize: 10, color: MUTED, marginBottom: 6 }}>📞 {c.mobile}</div>}
              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: statusColor(c.status) + "22", color: statusColor(c.status) }}>{statusLabel(c.status)}</span>
            </div>
          ))}
        </div>

        {loading && <div style={{ textAlign: "center", padding: 20, color: MUTED, fontSize: 12 }}>טוען…</div>}
        {!loading && rows.length === 0 && !err && <div style={{ textAlign: "center", padding: 32, color: MUTED, fontSize: 12 }}>לא נמצאו אנשי קשר</div>}
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
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <Av name={selected.fullName || "?"} size={48} color={NAVY} />
            <div style={{ fontWeight: 800, fontSize: 14, color: TEXT, marginTop: 8 }}>{selected.fullName || "—"}</div>
            <div style={{ fontSize: 11, color: MUTED }}>{selected.client?.name || selected.companyName || "—"}</div>
            <span style={{ display: "inline-block", marginTop: 6, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: statusColor(selected.status) + "22", color: statusColor(selected.status) }}>{statusLabel(selected.status)}</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <button onClick={() => openEdit(selected)} style={{ flex: 1, padding: "6px 0", border: `1px solid ${NAVY}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: NAVY, fontWeight: 700, fontSize: 11, fontFamily: "inherit" }}>✎ ערוך</button>
            <button onClick={() => remove(selected)} style={{ padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 6, background: WHITE, cursor: "pointer", color: ERR, fontSize: 11, fontFamily: "inherit" }}>🗑</button>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 7, fontSize: 11 }}>
            {selected.email && <div>✉ {selected.email}</div>}
            {selected.mobile && <div>📞 {selected.mobile}</div>}
            {selected.category && <div>🏷 {selected.category}</div>}
            <div>👤 מנהל לקוח: {selected.accountManager?.name || "—"}</div>
            <div>📨 דיוור: {selected.newsletter ? "כן" : "לא"}</div>
            <div>{selected.client ? "🔗 מקושר ללקוח ✓" : "לא מקושר ללקוח"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
