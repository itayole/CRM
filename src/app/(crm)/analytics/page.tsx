"use client";

import { useApp } from "@/context/AppContext";
import { Stat, HBar, StTag, PageShell } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { FUNNEL } from "@/lib/mockData";
import { NAVY, BLUE, MUTED, TEXT, WHITE, BORDER, OK, WARN, ERR } from "@/lib/tokens";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const BD = [
  { name: "מיכל", revenue: 340000 },
  { name: "ירון",  revenue: 215000 },
  { name: "אייל",  revenue: 180000 },
];

export default function AnalyticsPage() {
  const { visibleDeals: deals } = useApp();

  return (
    <PageShell>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>📊 אנליטיקס</div>
        <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Q2 2026</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="הכנסות Q2"    value="₪1.87M" sub="↑ 22% מ-Q1"    trend="up" />
        <Stat label="תחזית Q2"     value="₪2.1M"  sub="88% השגה"      trend="up" />
        <Stat label="עסקאות"       value="31"     sub="יעד: 40"        trend="up" />
        <Stat label="מחזור מכירה"  value="24 יום"  sub="↓ 18% שיפור"  trend="up" color={OK} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12, marginBottom: 12 }}>
        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={BD}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + v / 1000 + "K"} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Bar dataKey="revenue" fill={NAVY} radius={[4, 4, 0, 0]} name="הכנסות" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>Pipeline לפי שלב</div>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={FUNNEL} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value">
                {FUNNEL.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 6 }}>
            {FUNNEL.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: MUTED }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.fill }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "11px 13px", borderBottom: `1px solid ${BORDER}`, fontWeight: 700, fontSize: 12, color: TEXT }}>עסקאות פעילות</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F7F6F3" }}>
              {["עסקה", "שלב", "שווי", "הסתברות", "בריאות", "סגירה"].map(hd => (
                <th key={hd} style={{ padding: "8px 11px", textAlign: "right", fontWeight: 700, color: MUTED, fontSize: 10 }}>{hd}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td style={{ padding: "8px 11px" }}><div style={{ fontWeight: 600, color: TEXT }}>{d.title}</div><div style={{ fontSize: 10, color: MUTED }}>{d.company}</div></td>
                <td style={{ padding: "8px 11px" }}><StTag sid={d.stage} /></td>
                <td style={{ padding: "8px 11px", fontWeight: 700, color: NAVY }}>{fmt(d.value)}</td>
                <td style={{ padding: "8px 11px", fontWeight: 700, color: d.probability >= 70 ? OK : d.probability >= 40 ? WARN : ERR }}>{d.probability}%</td>
                <td style={{ padding: "8px 11px", minWidth: 80 }}><HBar score={d.health} /></td>
                <td style={{ padding: "8px 11px", color: MUTED }}>{d.closeDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
