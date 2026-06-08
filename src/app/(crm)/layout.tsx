"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { Av } from "@/components/ui";
import { NAVY, GOLD, BLUE, MUTED, WHITE, BORDER, WARN, TEXT } from "@/lib/tokens";

const NAV = [
  { id: "dashboard",    icon: "⊞", label: "לוח בקרה",    href: "/dashboard" },
  { id: "leads",        icon: "⚡", label: "לידים",        href: "/leads" },
  { id: "pipeline",     icon: "◫", label: "Pipeline",     href: "/pipeline" },
  { id: "clients",      icon: "🏢", label: "לקוחות",      href: "/clients" },
  { id: "projects",     icon: "📁", label: "פרויקטים",     href: "/projects" },
  { id: "contacts",     icon: "👤", label: "אנשי קשר",    href: "/contacts" },
  { id: "analytics",   icon: "📊", label: "אנליטיקס",    href: "/analytics" },
  { id: "automations", icon: "🔄", label: "אוטומציות",   href: "/automations", adminOnly: true },
  { id: "calendar",    icon: "📅", label: "יומן",         href: "/calendar" },
  { id: "tasks",       icon: "✅", label: "משימות",       href: "/tasks" },
  { id: "integrations",icon: "🔌", label: "אינטגרציות",  href: "/integrations", adminOnly: true },
  { id: "import",      icon: "⬆", label: "שאיבת תוכן",  href: "/import", adminOnly: true },
  { id: "users",       icon: "⚙", label: "משתמשים",      href: "/users", adminOnly: true },
  { id: "ai",          icon: "✦", label: "AI Assistant", href: "/ai" },
];

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, authLoading, activeUser, isAdmin, isImpersonating, stopImpersonate, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !currentUser) router.replace("/login");
  }, [authLoading, currentUser, router]);

  if (authLoading || !currentUser) return null;

  const visibleNav = NAV.filter(item => !item.adminOnly || isAdmin);
  const currentId = pathname.replace("/", "") || "dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F7F6F3", fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", direction: "rtl", color: TEXT, fontSize: 13 }}>

      {/* Impersonation Banner */}
      {isImpersonating && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, background: WARN, color: WHITE, padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 600 }}>
          <span>👁 אתה צופה כ: {activeUser?.name} ({activeUser?.role}) — מוצגים רק הנתונים שלו</span>
          <button onClick={() => { stopImpersonate(); router.push("/dashboard"); }}
            style={{ background: WHITE, color: WARN, border: "none", borderRadius: 6, padding: "4px 12px", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
            ← חזור למנהל
          </button>
        </div>
      )}

      <div style={{ display: "flex", width: "100%", height: "100%", paddingTop: isImpersonating ? 36 : 0 }}>
        {/* Sidebar */}
        <div style={{ width: 190, background: NAVY, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid " + BLUE }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: WHITE }}>SalesFlow</div>
            <div style={{ fontSize: 9, color: GOLD, fontWeight: 600, letterSpacing: 1 }}>CRM · Shiluv I²R</div>
          </div>

          <nav style={{ flex: 1, padding: "8px 7px", display: "flex", flexDirection: "column", gap: 1, overflowY: "auto" }}>
            {visibleNav.map(item => {
              const active = pathname === item.href || (item.href === "/dashboard" && pathname === "/");
              return (
                <Link key={item.id} href={item.href}
                  style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 9px", borderRadius: 6, background: active ? GOLD : "transparent", color: active ? NAVY : "#9DB5D8", fontSize: 11, fontWeight: active ? 700 : 500, width: "100%", textAlign: "right", whiteSpace: "nowrap", textDecoration: "none" }}>
                  <span style={{ fontSize: 13, width: 16, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid " + BLUE }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Av name={activeUser?.name || ""} size={26} color={isAdmin && !isImpersonating ? GOLD : NAVY} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: WHITE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeUser?.name}</div>
                <div style={{ fontSize: 9, color: MUTED }}>{activeUser?.role}</div>
              </div>
            </div>
            <button onClick={() => logout()}
              style={{ width: "100%", padding: "5px 0", background: "transparent", border: `1px solid ${BLUE}`, borderRadius: 6, color: MUTED, fontSize: 10, cursor: "pointer", fontFamily: "inherit" }}>
              התנתקות
            </button>
          </div>
        </div>

        {/* Main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Top header */}
          <div style={{ height: 42, background: WHITE, borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: MUTED }}>
              {visibleNav.find(n => pathname === n.href)?.icon} {visibleNav.find(n => pathname === n.href)?.label}
              {(!isAdmin || isImpersonating) && activeUser && (
                <span style={{ marginRight: 10, fontSize: 10, background: NAVY + "22", color: NAVY, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
                  מציג: הנתונים של {activeUser.name}
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{ fontSize: 11, color: MUTED }}>מאי 2026</div>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#1E8C5A" }} />
              <div style={{ fontSize: 11, color: "#1E8C5A", fontWeight: 600 }}>מחובר</div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
