"use client";

import { useState, useEffect, useCallback } from "react";
import { PageShell, PageTitle, Card, TabBar, Btn, Input } from "@/components/ui";
import {
  fetchConfigOptions, createConfigOption, updateConfigOption, deleteConfigOption,
  fetchConfig, createPipeline, updatePipeline, deletePipeline, createStage, updateStage, deleteStage,
  type ConfigOptionRow, type AppConfig,
} from "@/lib/api";
import { NAVY, GOLD, WHITE, MUTED, TEXT, BORDER, OK, ERR, SURF } from "@/lib/tokens";

const CATS = [
  { key: "lead_status", label: "סטטוסי ליד" },
  { key: "lead_source", label: "מקורות ליד" },
  { key: "task_type", label: "סוגי משימות" },
  { key: "project_status", label: "סטטוסי פרויקט" },
];

const inputStyle: React.CSSProperties = { padding: "6px 9px", border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 12, fontFamily: "inherit", outline: "none" };

export default function SettingsPage() {
  const [tab, setTab] = useState("lists");
  return (
    <PageShell>
      <PageTitle title="🛠 הגדרות" sub="ניהול רשימות התצורה והצינורות (מנהל מערכת)" />
      <TabBar tabs={[{ id: "lists", label: "רשימות" }, { id: "pipelines", label: "צינורות מכירה" }]} active={tab} onChange={setTab} />
      {tab === "lists" ? <ListsTab /> : <PipelinesTab />}
    </PageShell>
  );
}

// ── Lists (taxonomy) editor ──────────────────────────────────────────────────
function ListsTab() {
  const [options, setOptions] = useState<ConfigOptionRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try { setOptions(await fetchConfigOptions()); }
    catch (e) { setErr(e instanceof Error ? e.message : "טעינת ההגדרות נכשלה"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (id: number, patch: { label?: string; color?: string | null; active?: boolean }) => {
    const res = await updateConfigOption(id, patch);
    if (!res.ok) { alert(res.message ?? "העדכון נכשל"); return; }
    load();
  };
  const remove = async (o: ConfigOptionRow) => {
    if (!window.confirm(`למחוק את «${o.label}»? פריטים שכבר בשימוש ברשומות לא יושפעו, אך הערך לא יופיע יותר ברשימות.`)) return;
    const res = await deleteConfigOption(o.id);
    if (!res.ok) { alert(res.message ?? "המחיקה נכשלה"); return; }
    load();
  };

  if (loading) return <div style={{ color: MUTED, fontSize: 12 }}>טוען…</div>;
  if (err) return <div style={{ color: ERR, fontSize: 12 }}>⚠ {err}</div>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 12 }}>
      {CATS.map(cat => (
        <Card key={cat.key} style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 13 }}>{cat.label}</div>
          {options.filter(o => o.category === cat.key).map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <input type="color" defaultValue={o.color || "#7B8FA6"} title="צבע"
                onBlur={e => { if (e.target.value !== (o.color || "")) save(o.id, { color: e.target.value }); }}
                style={{ width: 26, height: 26, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 0, cursor: "pointer", background: WHITE }} />
              <input defaultValue={o.label} key={o.label}
                onBlur={e => { const v = e.target.value.trim(); if (v && v !== o.label) save(o.id, { label: v }); }}
                style={{ ...inputStyle, flex: 1, opacity: o.active ? 1 : 0.5 }} />
              <button onClick={() => save(o.id, { active: !o.active })} title={o.active ? "פעיל" : "כבוי"}
                style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${BORDER}`, background: o.active ? "#EAF3DE" : SURF, color: o.active ? OK : MUTED, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                {o.active ? "פעיל" : "כבוי"}
              </button>
              <button onClick={() => remove(o)} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 5, border: `1px solid ${BORDER}`, background: WHITE, color: ERR, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
            </div>
          ))}
          <AddRow onAdd={async (label, color) => { const res = await createConfigOption({ category: cat.key, label, color }); if (!res.ok) { alert(res.message ?? "ההוספה נכשלה"); return false; } load(); return true; }} />
        </Card>
      ))}
    </div>
  );
}

function AddRow({ onAdd }: { onAdd: (label: string, color: string) => Promise<boolean> }) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#5B8DEF");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!label.trim()) return;
    setBusy(true);
    const ok = await onAdd(label.trim(), color);
    setBusy(false);
    if (ok) setLabel("");
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${BORDER}` }}>
      <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 26, height: 26, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 0, cursor: "pointer", background: WHITE }} />
      <input value={label} onChange={e => setLabel(e.target.value)} placeholder="הוסף פריט חדש…" onKeyDown={e => { if (e.key === "Enter") add(); }} style={{ ...inputStyle, flex: 1 }} />
      <button onClick={add} disabled={busy || !label.trim()} style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 6, border: "none", background: NAVY, color: WHITE, cursor: label.trim() ? "pointer" : "default", opacity: label.trim() ? 1 : 0.5, fontFamily: "inherit" }}>+ הוסף</button>
    </div>
  );
}

// ── Pipelines & stages editor ────────────────────────────────────────────────
function PipelinesTab() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    try { setConfig(await fetchConfig()); }
    catch (e) { setErr(e instanceof Error ? e.message : "טעינת הצינורות נכשלה"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const guard = async (resOrPromise: Promise<{ ok: boolean; message?: string }> | { ok: boolean; message?: string }) => {
    const res = await resOrPromise;
    if (!res.ok) { alert(res.message ?? "הפעולה נכשלה"); return false; }
    load();
    return true;
  };

  if (err) return <div style={{ color: ERR, fontSize: 12 }}>⚠ {err}</div>;
  if (!config) return <div style={{ color: MUTED, fontSize: 12 }}>טוען…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {config.pipelines.map(p => (
        <Card key={p.id} style={{ padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input defaultValue={p.name} key={p.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) guard(updatePipeline(p.id, { name: v })); }}
              style={{ ...inputStyle, fontWeight: 700, fontSize: 14, flex: 1, maxWidth: 280 }} />
            {p.isDefault
              ? <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 10, background: "#FAEEDA", color: GOLD }}>ברירת מחדל</span>
              : <button onClick={() => guard(updatePipeline(p.id, { isDefault: true }))} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 10, border: `1px solid ${BORDER}`, background: WHITE, color: NAVY, cursor: "pointer", fontFamily: "inherit" }}>הפוך לברירת מחדל</button>}
            <button onClick={() => { if (window.confirm(`למחוק את הצינור «${p.name}»?`)) guard(deletePipeline(p.id)); }} style={{ marginInlineStart: "auto", fontSize: 11, padding: "3px 8px", borderRadius: 5, border: `1px solid ${BORDER}`, background: WHITE, color: ERR, cursor: "pointer", fontFamily: "inherit" }}>🗑 מחק צינור</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {p.stages.map(s => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, background: SURF, borderRadius: 7, padding: "6px 8px" }}>
                <input type="color" defaultValue={s.color || "#5B8DEF"} onBlur={e => { if (e.target.value !== (s.color || "")) guard(updateStage(s.id, { color: e.target.value })); }}
                  style={{ width: 26, height: 26, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 0, cursor: "pointer", background: WHITE }} />
                <input defaultValue={s.label} key={s.label} onBlur={e => { const v = e.target.value.trim(); if (v && v !== s.label) guard(updateStage(s.id, { label: v })); }}
                  style={{ ...inputStyle, flex: 1 }} />
                <label style={{ fontSize: 10, color: MUTED, display: "flex", alignItems: "center", gap: 3 }}>
                  הסתברות
                  <input type="number" defaultValue={s.probability} min={0} max={100} key={s.probability}
                    onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== s.probability) guard(updateStage(s.id, { probability: Math.max(0, Math.min(100, v)) })); }}
                    style={{ ...inputStyle, width: 56 }} />%
                </label>
                <button onClick={() => guard(updateStage(s.id, { isWon: !s.isWon, isLost: false }))} title="שלב זכייה"
                  style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, border: `1px solid ${BORDER}`, background: s.isWon ? "#EAF3DE" : WHITE, color: s.isWon ? OK : MUTED, cursor: "pointer", fontFamily: "inherit" }}>זכייה</button>
                <button onClick={() => guard(updateStage(s.id, { isLost: !s.isLost, isWon: false }))} title="שלב הפסד"
                  style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, border: `1px solid ${BORDER}`, background: s.isLost ? "#FDECEC" : WHITE, color: s.isLost ? ERR : MUTED, cursor: "pointer", fontFamily: "inherit" }}>הפסד</button>
                <button onClick={() => { if (window.confirm(`למחוק את השלב «${s.label}»?`)) guard(deleteStage(s.id)); }} style={{ fontSize: 11, padding: "3px 6px", borderRadius: 5, border: `1px solid ${BORDER}`, background: WHITE, color: ERR, cursor: "pointer", fontFamily: "inherit" }}>🗑</button>
              </div>
            ))}
          </div>
          <AddRow onAdd={async (label, color) => guard(await createStage({ pipelineId: p.id, label, color }))} />
        </Card>
      ))}

      <Card style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, color: TEXT, marginBottom: 8, fontSize: 13 }}>הוסף צינור חדש</div>
        <NewPipelineRow onAdd={async (name) => guard(await createPipeline({ name }))} />
      </Card>
    </div>
  );
}

function NewPipelineRow({ onAdd }: { onAdd: (name: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => { if (!name.trim()) return; setBusy(true); const ok = await onAdd(name.trim()); setBusy(false); if (ok) setName(""); };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input value={name} onChange={setName} placeholder="שם הצינור" style={{ flex: 1, maxWidth: 280 }} />
      <Btn onClick={add} disabled={busy || !name.trim()}>+ הוסף צינור</Btn>
    </div>
  );
}
