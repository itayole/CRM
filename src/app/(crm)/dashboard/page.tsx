"use client";

import { useApp } from "@/context/AppContext";
import { Stat, Av, PageShell, PageTitle, Card } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { REV_DATA, FUNNEL, ACTS, TEAM_PERF, TEAM_COLORS } from "@/lib/mockData";
import { NAVY, GOLD, BLUE, MUTED, TEXT, WHITE, BORDER, OK } from "@/lib/tokens";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { visibleDeals, visibleLeads, visibleTasks } = useApp();

  const pipe = visibleDeals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);
  const won = visibleDeals.filter(d => d.stage === "closed_won").reduce((s, d) => s + d.value, 0);
  const wr = visibleDeals.length ? Math.round(visibleDeals.filter(d => d.stage === "closed_won").length / visibleDeals.length * 100) : 0;
  const openTasks = visibleTasks.filter(t => t.status === "open").length;

  return (
    <PageShell>
      <PageTitle title="לוח בקרה" sub="מאי 2026 · Q2" />

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="PIPELINE"        value={fmt(pipe)} sub="↑ 14% מהרבעון" trend="up" color={NAVY} />
        <Stat label="נסגר החודש"      value={fmt(won)}  sub="יעד: ₪500K"    trend="up" color={OK} />
        <Stat label="WIN RATE"         value={wr + "%"}  sub="ממוצע: 61%"    trend="up" color={BLUE} />
        <Stat label="משימות פתוחות"   value={openTasks} sub={visibleLeads.filter(l => l.status !== "disqualified").length + " לידים פעילים"} color={GOLD} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>הכנסות — בפועל מול תחזית</div>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={REV_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: MUTED }} />
              <YAxis tick={{ fontSize: 10, fill: MUTED }} tickFormatter={(v: number) => "₪" + v / 1000 + "K"} />
              <Tooltip formatter={(v: any) => fmt(v)} />
              <Line type="monotone" dataKey="actual"   stroke={NAVY} strokeWidth={2} dot={{ fill: NAVY, r: 3 }} name="בפועל" />
              <Line type="monotone" dataKey="forecast" stroke={GOLD} strokeWidth={2} strokeDasharray="5 4" dot={false} name="תחזית" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>משפך מכירות</div>
          {FUNNEL.map((item, i) => {
            const pct = Math.round(item.value / FUNNEL[0].value * 100);
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: MUTED, minWidth: 55, textAlign: "right" }}>{item.name}</div>
                <div style={{ flex: 1, height: 18, background: "#F7F6F3", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: item.fill, borderRadius: 3, display: "flex", alignItems: "center", paddingRight: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: WHITE }}>{item.value}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: MUTED, minWidth: 28 }}>{pct}%</div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Team + Activity row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>ביצועי צוות</div>
          {TEAM_PERF.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < TEAM_PERF.length - 1 ? 8 : 0 }}>
              <Av name={m.name} size={30} color={TEAM_COLORS[m.colorIdx]} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: TEXT }}>{m.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{m.deals} עסקאות · Win {m.wr}%</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: OK }}>{fmt(m.revenue)}</div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פעילות אחרונה</div>
          {ACTS.map(a => (
            <div key={a.id} style={{ display: "flex", gap: 7, marginBottom: 7 }}>
              <div style={{ fontSize: 13 }}>
                {({ email: "✉", call: "📞", deal: "🤝", note: "📝", lead: "⚡" } as Record<string, string>)[a.type]}
              </div>
              <div>
                <div style={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>{a.text}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{a.time} · {a.user}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </PageShell>
  );
}
