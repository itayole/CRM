"use client";

import { useState, useEffect } from "react";
import { Stat, HBar, Bdg, PageShell, PageTitle, Card } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { fetchAnalytics, type SalesAnalytics } from "@/lib/api";
import { NAVY, BLUE, GOLD, MUTED, TEXT, WHITE, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE = [NAVY, GOLD, "#E0703A", OK, BLUE, "#7C3AED", "#0891B2"];

export default function AnalyticsPage() {
  const [a, setA] = useState<SalesAnalytics | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchAnalytics().then(setA).catch(e => setErr(e instanceof Error ? e.message : "טעינת הנתונים נכשלה"));
  }, []);

  if (err) return <PageShell><PageTitle title="📊 אנליטיקס" /><div style={{ color: ERR, fontSize: 12 }}>⚠ {err}</div></PageShell>;
  if (!a) return <PageShell><PageTitle title="📊 אנליטיקס" /><div style={{ color: MUTED, fontSize: 12 }}>טוען נתונים…</div></PageShell>;

  const k = a.kpis;
  const teamData = a.teamPerformance.map(t => ({ name: t.name, revenue: t.wonValue }));
  const stageData = a.byStage.filter(s => s.count > 0).map(s => ({ name: s.label, value: s.count, fill: s.color || NAVY }));

  return (
    <PageShell>
      <PageTitle title="📊 אנליטיקס" sub="נתוני מכירות חיים מתוך מערכת ה-CRM" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="שווי Pipeline פתוח" value={fmt(k.openValue)} sub={`${k.openCount} עסקאות פתוחות`} color={NAVY} />
        <Stat label="הכנסות (עסקאות שנסגרו)" value={fmt(k.wonValue)} sub={`${k.wonCount} עסקאות זכייה`} color={OK} />
        <Stat label="שיעור זכייה" value={`${k.winRate}%`} sub={`מתוך ${k.wonCount + k.lostCount} שנסגרו`} color={BLUE} />
        <Stat label="עסקה ממוצעת" value={fmt(k.avgDealValue)} sub={`${k.totalCount} עסקאות סה״כ`} color={GOLD} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות (הכנסות מעסקאות שנסגרו)</div>
          {teamData.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 12, padding: 30, textAlign: "center" }}>אין נתוני עסקאות עדיין</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + v / 1000 + "K"} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} name="הכנסות" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>Pipeline לפי שלב</div>
          {stageData.length === 0 ? (
            <div style={{ color: MUTED, fontSize: 12, padding: 30, textAlign: "center" }}>אין עסקאות בשלבים</div>
          ) : (
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
        {a.activeDeals.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 12, padding: 30, textAlign: "center" }}>אין עסקאות פעילות</div>
        ) : (
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
    </PageShell>
  );
}
