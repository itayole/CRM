"use client";

import { useState, useEffect } from "react";
import { Stat, Av, PageShell, PageTitle, Card } from "@/components/ui";
import { fmt } from "@/lib/utils";
import { fetchStats, type DashboardStats } from "@/lib/api";
import { LEAD_STATUS } from "@/lib/mockData";
import { NAVY, GOLD, BLUE, MUTED, TEXT, WHITE, BORDER, OK, SURF } from "@/lib/tokens";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BARS = [NAVY, BLUE, GOLD, "#0891B2", "#7C3AED", "#059669"];

export default function DashboardPage() {
  const [s, setS] = useState<DashboardStats | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchStats().then(setS).catch(e => setErr(e instanceof Error ? e.message : "טעינת הנתונים נכשלה"));
  }, []);

  if (err) return <PageShell><PageTitle title="לוח בקרה" /><div style={{ color: "#C0392B", fontSize: 12 }}>⚠ {err}</div></PageShell>;
  if (!s) return <PageShell><PageTitle title="לוח בקרה" /><div style={{ color: MUTED, fontSize: 12 }}>טוען נתונים…</div></PageShell>;

  const methodologyData = s.projectsByMethodology.map(m => ({ name: m.methodology, value: m.count }));
  const maxLead = Math.max(1, ...s.leadsByStatus.map(l => l.count));

  return (
    <PageShell>
      <PageTitle title="לוח בקרה" sub="נתונים חיים מתוך מערכת ה-CRM" />

      {/* KPI row — live entity counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
        <Stat label="לקוחות" value={s.counts.clients.toLocaleString()} color={NAVY} />
        <Stat label="פרויקטים" value={s.counts.projects.toLocaleString()} sub={`חיוב מצטבר: ${fmt(s.totalProjectBilling)}`} color={BLUE} />
        <Stat label="אנשי קשר" value={s.counts.contacts.toLocaleString()} color={GOLD} />
        <Stat label="לידים" value={s.counts.leads.toLocaleString()} sub={`${s.counts.deals} עסקאות · ${s.counts.users} משתמשים`} color={OK} />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פרויקטים לפי מתודולוגיה</div>
          {methodologyData.length === 0 ? <div style={{ color: MUTED, fontSize: 12, padding: 20, textAlign: "center" }}>אין נתונים</div> : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={methodologyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: MUTED }} />
                <YAxis tick={{ fontSize: 10, fill: MUTED }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {methodologyData.map((_, i) => <Cell key={i} fill={BARS[i % BARS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>לידים לפי סטטוס</div>
          {s.leadsByStatus.length === 0 ? <div style={{ color: MUTED, fontSize: 12, padding: 20, textAlign: "center" }}>אין לידים עדיין</div> : s.leadsByStatus.map((l, i) => {
            const meta = LEAD_STATUS[l.status] || { label: l.status, color: MUTED };
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                <div style={{ fontSize: 11, color: MUTED, minWidth: 55, textAlign: "right" }}>{meta.label}</div>
                <div style={{ flex: 1, height: 18, background: SURF, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(l.count / maxLead * 100)}%`, height: "100%", background: meta.color, borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: TEXT, minWidth: 28 }}>{l.count}</div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Top clients + recent projects */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>לקוחות מובילים (לפי מס׳ פרויקטים)</div>
          {s.topClients.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < s.topClients.length - 1 ? 8 : 0 }}>
              <Av name={c.name} size={30} color={BARS[i % BARS.length]} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: NAVY }}>{c.projectCount} פרויקטים</div>
            </div>
          ))}
        </Card>

        <Card style={{ padding: 14 }}>
          <div style={{ fontWeight: 700, color: TEXT, marginBottom: 10, fontSize: 12 }}>פרויקטים אחרונים</div>
          {s.recentProjects.map(p => (
            <div key={p.id} style={{ display: "flex", gap: 7, marginBottom: 8 }}>
              <div style={{ fontSize: 13 }}>📁</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, color: TEXT, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                <div style={{ fontSize: 10, color: MUTED }}>{p.client || "—"}{p.statusText ? ` · ${p.statusText}` : ""}{p.createdAt ? ` · ${String(p.createdAt).slice(0, 10)}` : ""}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </PageShell>
  );
}
