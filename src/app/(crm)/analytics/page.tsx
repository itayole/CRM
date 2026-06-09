"use client";

import { useState, useEffect } from "react";
import { Stat, HBar, Bdg, PageShell, PageTitle, Card, TabBar } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { fetchAnalytics, fetchProjectAnalytics, type SalesAnalytics, type ProjectAnalytics } from "@/lib/api";
import { NAVY, BLUE, GOLD, MUTED, TEXT, WHITE, BORDER, OK, WARN, ERR, SURF } from "@/lib/tokens";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE = [NAVY, GOLD, "#E0703A", OK, BLUE, "#7C3AED", "#0891B2"];
const BARS = [NAVY, BLUE, GOLD, "#0891B2", "#7C3AED", "#059669", "#E0703A"];

export default function AnalyticsPage() {
  const [tab, setTab] = useState("projects");
  return (
    <PageShell>
      <PageTitle title="📊 אנליטיקס" sub="נתונים חיים מתוך מערכת ה-CRM" />
      <TabBar tabs={[{ id: "projects", label: "פרויקטים וחיוב" }, { id: "sales", label: "מכירות (Pipeline)" }]} active={tab} onChange={setTab} />
      {tab === "projects" ? <ProjectsTab /> : <SalesTab />}
    </PageShell>
  );
}

// ── Project / billing analytics (research-firm view) ─────────────────────────
function ProjectsTab() {
  const [a, setA] = useState<ProjectAnalytics | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchProjectAnalytics().then(setA).catch(e => setErr(e instanceof Error ? e.message : "טעינת הנתונים נכשלה"));
  }, []);

  if (err) return <div style={{ color: ERR, fontSize: 12 }}>⚠ {err}</div>;
  if (!a) return <div style={{ color: MUTED, fontSize: 12 }}>טוען נתונים…</div>;

  const k = a.kpis;
  const methodologyData = a.byMethodology.map(m => ({ name: m.name, value: m.billing }));
  const managerData = a.byManager.map(m => ({ name: m.name, value: m.billing }));
  const maxClient = Math.max(1, ...a.byClient.map(c => c.billing));
  const maxStatus = Math.max(1, ...a.byStatus.map(s => s.count));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="חיוב מצטבר" value={fmt(k.totalBilling)} color={NAVY} />
        <Stat label="פרויקטים" value={k.totalProjects.toLocaleString()} sub={`${k.withBilling.toLocaleString()} עם חיוב`} color={BLUE} />
        <Stat label="חיוב ממוצע לפרויקט" value={fmt(k.avgBilling)} sub="מתוך פרויקטים עם חיוב" color={GOLD} />
        <Stat label="לקוחות מובילים" value={a.byClient.length} sub="לפי חיוב (מוצגים)" color={OK} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>חיוב לפי מתודולוגיה</div>
          {methodologyData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={methodologyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + Math.round(v / 1000) + "K"} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="חיוב">
                  {methodologyData.map((_, i) => <Cell key={i} fill={BARS[i % BARS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>חיוב לפי מנהל לקוח</div>
          {managerData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={managerData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + Math.round(v / 1000) + "K"} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="value" fill={NAVY} radius={[4, 4, 0, 0]} name="חיוב" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>לקוחות מובילים לפי חיוב</div>
          {a.byClient.length === 0 ? <Empty /> : a.byClient.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 11, color: TEXT, minWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ flex: 1, height: 16, background: SURF, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(c.billing / maxClient * 100)}%`, height: "100%", background: BARS[i % BARS.length], borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: NAVY, minWidth: 64, textAlign: "left" }}>{fmt(c.billing)}</div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פרויקטים לפי סטטוס</div>
          {a.byStatus.length === 0 ? <Empty /> : a.byStatus.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 11, color: MUTED, minWidth: 110, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
              <div style={{ flex: 1, height: 16, background: SURF, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(s.count / maxStatus * 100)}%`, height: "100%", background: BLUE, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, minWidth: 40, textAlign: "left" }}>{s.count.toLocaleString()}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card style={{ padding: 14 }}>
        <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פרויקטים לפי סוג מחקר</div>
        {a.byResearchType.length === 0 ? <Empty /> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {a.byResearchType.map((r, i) => (
              <div key={i} style={{ flex: "1 1 180px", background: SURF, borderRadius: 8, padding: "10px 12px", borderRight: `3px solid ${BARS[i % BARS.length]}` }}>
                <div style={{ fontSize: 11, color: TEXT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: NAVY, marginTop: 3 }}>{fmt(r.billing)}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{r.count.toLocaleString()} פרויקטים</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

const Empty = () => <div style={{ color: MUTED, fontSize: 12, padding: 24, textAlign: "center" }}>אין נתונים</div>;

// ── Sales analytics (deal-centric) ───────────────────────────────────────────
function SalesTab() {
  const [a, setA] = useState<SalesAnalytics | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchAnalytics().then(setA).catch(e => setErr(e instanceof Error ? e.message : "טעינת הנתונים נכשלה"));
  }, []);

  if (err) return <div style={{ color: ERR, fontSize: 12 }}>⚠ {err}</div>;
  if (!a) return <div style={{ color: MUTED, fontSize: 12 }}>טוען נתונים…</div>;

  const k = a.kpis;
  const teamData = a.teamPerformance.map(t => ({ name: t.name, revenue: t.wonValue }));
  const stageData = a.byStage.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count, fill: s.color || NAVY }));

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="שווי Pipeline פתוח" value={fmt(k.openValue)} sub={`${k.openCount} עסקאות פתוחות`} color={NAVY} />
        <Stat label="הכנסות (עסקאות שנסגרו)" value={fmt(k.wonValue)} sub={`${k.wonCount} עסקאות זכייה`} color={OK} />
        <Stat label="שיעור זכייה" value={`${k.winRate}%`} sub={`מתוך ${k.wonCount + k.lostCount} שנסגרו`} color={BLUE} />
        <Stat label="עסקה ממוצעת" value={fmt(k.avgDealValue)} sub={`${k.totalCount} עסקאות סה״כ`} color={GOLD} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות (הכנסות מעסקאות שנסגרו)</div>
          {teamData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + v / 1000 + "K"} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} name="הכנסות" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>Pipeline לפי שלב</div>
          {stageData.length === 0 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={stageData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">
                    {stageData.map((e, i) => <Cell key={i} fill={e.fill || PIE[i % PIE.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6 }}>
                {stageData.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUTED }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.fill || PIE[i % PIE.length] }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card style={{ overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 12, color: TEXT }}>עסקאות פעילות</div>
        {a.activeDeals.length === 0 ? <Empty /> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#F7F6F3" }}>
                {["עסקה", "שלב", "שווי", "הסתברות", "בריאות", "סגירה"].map(hd => (
                  <th key={hd} style={{ padding: "8px 11px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 10 }}>{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.activeDeals.map(d => (
                <tr key={d.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "8px 11px" }}><div style={{ fontWeight: 600, color: TEXT }}>{d.title}</div><div style={{ fontSize: 10, color: MUTED }}>{d.company}</div></td>
                  <td style={{ padding: "8px 11px" }}>{d.stageLabel ? <Bdg label={d.stageLabel} color={d.stageColor || MUTED} /> : "—"}</td>
                  <td style={{ padding: "8px 11px", fontWeight: 700, color: NAVY }}>{fmt(d.value)}</td>
                  <td style={{ padding: "8px 11px", fontWeight: 700, color: d.probability >= 70 ? OK : d.probability >= 40 ? WARN : ERR }}>{d.probability}%</td>
                  <td style={{ padding: "8px 11px", minWidth: 80 }}><HBar score={d.health} /></td>
                  <td style={{ padding: "8px 11px", color: MUTED }}>{d.closeDate || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
