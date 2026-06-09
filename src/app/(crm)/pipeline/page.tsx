"use client";

import { useState, useEffect, useCallback } from "react";
import { HBar, Btn, Modal, FormRow, Field, Input, Select } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { fetchConfig, fetchDeals, createDeal, updateDealStage, fetchClients, type AppConfig, type CrmDeal, type PipelineCfg } from "@/lib/api";
import { NAVY, GOLD, GOLD_L, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR } from "@/lib/tokens";

type Named = { id: number; name: string };
const emptyForm = { title: "", company: "", value: "", probability: "50", stageId: "", clientId: "" };

export default function PipelinePage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [pipelineId, setPipelineId] = useState<number | null>(null);
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [clientQuery, setClientQuery] = useState("");
  const [clientResults, setClientResults] = useState<Named[]>([]);

  useEffect(() => {
    fetchConfig().then(c => { setConfig(c); setPipelineId(c.pipelines[0]?.id ?? null); }).catch(e => setErr(e instanceof Error ? e.message : "טעינת התצורה נכשלה"));
  }, []);

  const reloadDeals = useCallback(async (pid: number) => {
    setLoading(true);
    try { setDeals(await fetchDeals({ pipelineId: pid })); } catch (e) { setErr(e instanceof Error ? e.message : "טעינת העסקאות נכשלה"); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (pipelineId) reloadDeals(pipelineId); }, [pipelineId, reloadDeals]);

  useEffect(() => {
    if (!clientQuery) { setClientResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await fetchClients({ q: clientQuery, limit: 8 }); setClientResults(r.data.map(c => ({ id: c.id, name: c.name }))); } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  const pipeline: PipelineCfg | undefined = config?.pipelines.find(p => p.id === pipelineId);
  const stages = pipeline?.stages ?? [];

  const move = async (dealId: number, stageId: number) => {
    const prev = deals;
    setDeals(ds => ds.map(d => d.id === dealId ? { ...d, stageId } : d)); // optimistic
    const res = await updateDealStage(dealId, stageId);
    if (!res.ok) { setDeals(prev); alert(res.message ?? "העברת השלב נכשלה"); }
  };

  const save = async () => {
    if (!form.title || !form.company) { setFormErr("שם עסקה וחברה הם שדות חובה"); return; }
    if (!pipelineId || !form.stageId) { setFormErr("בחר שלב"); return; }
    setSaving(true); setFormErr("");
    const res = await createDeal({
      title: form.title, company: form.company, value: parseFloat(form.value) || 0,
      probability: parseInt(form.probability) || 50, pipelineId, stageId: Number(form.stageId),
      clientId: form.clientId ? Number(form.clientId) : undefined,
    });
    setSaving(false);
    if (!res.ok) { setFormErr(res.message ?? "השמירה נכשלה"); return; }
    setModal(false); setForm(emptyForm); reloadDeals(pipelineId);
  };

  const openVal = deals.filter(d => { const st = stages.find(s => s.id === d.stageId); return st && !st.isWon && !st.isLost; }).reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {modal && (
        <Modal title="+ עסקה חדשה" onClose={() => { setModal(false); setForm(emptyForm); setFormErr(""); }}>
          <FormRow>
            <Field label="שם עסקה *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="שם העסקה" style={{ width: "100%" }} /></Field>
            <Field label="חברה *"><Input value={form.company} onChange={v => setForm(p => ({ ...p, company: v }))} placeholder="שם החברה" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שווי (₪)"><Input value={form.value} onChange={v => setForm(p => ({ ...p, value: v }))} placeholder="120000" type="number" style={{ width: "100%" }} /></Field>
            <Field label="הסתברות %"><Input value={form.probability} onChange={v => setForm(p => ({ ...p, probability: v }))} type="number" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="שלב">
              <Select value={form.stageId} onChange={v => setForm(p => ({ ...p, stageId: v }))} options={[{ value: "", label: "בחר שלב" }, ...stages.map(s => ({ value: String(s.id), label: s.label }))]} style={{ width: "100%" }} />
            </Field>
            <Field label="צינור">
              <Input value={pipeline?.name ?? ""} onChange={() => {}} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}>
            <Field label="קישור ללקוח (אופציונלי)">
              {form.clientId ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <span style={{ background: "#E6F1FB", color: NAVY, padding: "4px 10px", borderRadius: 7, fontWeight: 700 }}>🏢 {form.company}</span>
                  <button onClick={() => setForm(p => ({ ...p, clientId: "" }))} style={{ fontSize: 11, background: "none", border: "none", color: ERR, cursor: "pointer", fontFamily: "inherit" }}>נתק</button>
                </div>
              ) : (
                <div style={{ position: "relative" }}>
                  <Input value={clientQuery} onChange={setClientQuery} placeholder="הקלד שם לקוח..." style={{ width: "100%" }} />
                  {clientResults.length > 0 && (
                    <div style={{ position: "absolute", zIndex: 10, top: "100%", right: 0, left: 0, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, marginTop: 2, maxHeight: 160, overflowY: "auto", boxShadow: "0 6px 18px rgba(0,0,0,.12)" }}>
                      {clientResults.map(c => (
                        <div key={c.id} onClick={() => { setForm(p => ({ ...p, clientId: String(c.id), company: c.name })); setClientQuery(""); setClientResults([]); }}
                          style={{ padding: "7px 11px", fontSize: 12, cursor: "pointer", borderBottom: `1px solid ${SURF}` }}>{c.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Field>
          </div>
          {formErr && <div style={{ fontSize: 12, color: ERR, marginBottom: 10 }}>{formErr}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <Btn onClick={save} disabled={saving}>{saving ? "שומר…" : "✓ שמור"}</Btn>
            <Btn onClick={() => { setModal(false); setForm(emptyForm); }} variant="secondary">ביטול</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>ניהול Pipeline</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>גרור עסקאות בין שלבים · {deals.length} עסקאות</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {config && config.pipelines.length > 1 && (
            <Select value={String(pipelineId ?? "")} onChange={v => setPipelineId(Number(v))} options={config.pipelines.map(p => ({ value: String(p.id), label: p.name }))} style={{ fontSize: 12 }} />
          )}
          <div style={{ fontSize: 12, color: MUTED, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: "7px 12px", fontWeight: 600 }}>
            פתוח: <span style={{ color: NAVY, fontWeight: 800 }}>{fmt(openVal)}</span>
          </div>
          <Btn onClick={() => { setForm({ ...emptyForm, stageId: stages[0] ? String(stages[0].id) : "" }); setFormErr(""); setModal(true); }}>+ עסקה</Btn>
        </div>
      </div>

      {err && <div style={{ color: ERR, fontSize: 12, marginBottom: 10 }}>⚠ {err}</div>}

      <div style={{ display: "flex", gap: 9, overflowX: "auto", flex: 1, paddingBottom: 6 }}>
        {stages.map(stage => {
          const sd = deals.filter(d => d.stageId === stage.id);
          const isOver = dropStage === stage.id;
          const color = stage.color || NAVY;
          return (
            <div key={stage.id}
              style={{ minWidth: 195, width: 195, display: "flex", flexDirection: "column", gap: 6, background: isOver ? GOLD_L : SURF, borderRadius: 9, border: `2px solid ${isOver ? GOLD : "transparent"}`, padding: 9 }}
              onDragOver={e => { e.preventDefault(); setDropStage(stage.id); }}
              onDrop={() => { if (dragId) move(dragId, stage.id); setDragId(null); setDropStage(null); }}
              onDragLeave={() => setDropStage(null)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  <span style={{ fontWeight: 700, fontSize: 11, color: TEXT }}>{stage.label}</span>
                  <span style={{ fontSize: 10, color: MUTED }}>({sd.length})</span>
                </div>
                <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{fmt(sd.reduce((s, d) => s + d.value, 0))}</span>
              </div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
                {!loading && sd.length === 0 && <div style={{ textAlign: "center", padding: "14px 0", fontSize: 11, color: MUTED }}>—</div>}
                {sd.map(deal => (
                  <div key={deal.id} draggable onDragStart={() => setDragId(deal.id)}
                    style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 7, padding: 9, cursor: "grab", borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: TEXT, marginBottom: 2 }}>{deal.title}</div>
                    <div style={{ fontSize: 10, color: MUTED, marginBottom: 5 }}>{deal.client?.name || deal.company}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 4 }}>{fmt(deal.value)}</div>
                    <HBar score={deal.health} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: MUTED }}>{deal.closeDate ? String(deal.closeDate).slice(0, 10) : "—"}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: deal.probability >= 70 ? OK : deal.probability >= 40 ? WARN : ERR }}>{deal.probability}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {stages.length === 0 && !err && <div style={{ color: MUTED, fontSize: 12, padding: 20 }}>אין שלבים מוגדרים בצינור.</div>}
      </div>
    </div>
  );
}
