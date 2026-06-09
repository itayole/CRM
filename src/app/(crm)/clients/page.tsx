"use client";

import { useState, useEffect, useCallback } from "react";
import { Av, Stat, Input } from "@/components/ui";
import { fetchClients, type CrmClientRow } from "@/lib/api";
import { NAVY, GOLD, GOLD_L, WHITE, MUTED, TEXT, BORDER, OK, SURF } from "@/lib/tokens";

export default function ClientsPage() {
  const [rows, setRows] = useState<CrmClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState<CrmClientRow | null>(null);

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

  // initial load + debounced search
  useEffect(() => {
    const t = setTimeout(() => load(1, q, false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  const canLoadMore = rows.length < total;

  return (
    <div style={{ padding: "16px 20px", display: "flex", gap: 14, height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>🏢 לקוחות</div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{total.toLocaleString()} לקוחות · מוצגים {rows.length}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
          <Stat label="סה״כ לקוחות" value={total.toLocaleString()} color={NAVY} />
          <Stat label="עם פרויקטים" value={rows.filter(c => c.projectCount > 0).length} sub="מתוך המוצגים" color={OK} />
          <Stat label="עם אנשי קשר" value={rows.filter(c => c.contactCount > 0).length} sub="מתוך המוצגים" color={GOLD} />
        </div>

        <Input value={q} onChange={setQ} placeholder="🔍 חיפוש לקוח לפי שם / תעשייה / מייל..." style={{ width: "100%", marginBottom: 12 }} />

        {err && <div style={{ textAlign: "center", padding: 24, color: "#C0392B", fontSize: 12 }}>⚠ {err} <button onClick={() => load(1, q, false)} style={{ marginRight: 8, textDecoration: "underline", background: "none", border: "none", color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>נסה שוב</button></div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
          {rows.map(c => (
            <div key={c.id} onClick={() => setSelected(selected?.id === c.id ? null : c)}
              style={{ background: selected?.id === c.id ? GOLD_L : WHITE, border: `1px solid ${selected?.id === c.id ? GOLD : BORDER}`, borderRadius: 10, padding: 14, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <Av name={c.name} size={38} color={NAVY} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
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
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 8 }}>פרטים</div>
            {selected.email && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>✉ {selected.email}</div>}
            {selected.phone && <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>📞 {selected.phone}</div>}
            <div style={{ fontSize: 11, color: TEXT, marginBottom: 4 }}>👤 מנהל לקוח: {selected.assignee?.name || "—"}</div>
          </div>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[["פרויקטים", selected.projectCount], ["אנשי קשר", selected.contactCount], ["עסקאות", selected.dealCount]].map(([l, v]) => (
              <div key={l} style={{ background: SURF, borderRadius: 6, padding: "8px 0", textAlign: "center" }}>
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
