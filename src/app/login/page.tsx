"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { Av } from "@/components/ui";
import { NAVY, GOLD, WHITE, TEXT, MUTED, BORDER, WARN, ERR } from "@/lib/tokens";

export default function LoginPage() {
  const { users, login } = useApp();
  const router = useRouter();
  const [selId, setSelId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const activeUsers = users.filter(u => u.active);
  const isAdminRole = (u: { role: string }) => u.role === "מנהל מערכת";

  const handleLogin = () => {
    if (!selId) { setError("בחר משתמש להתחברות"); return; }
    const user = users.find(u => u.id === selId);
    if (user) { login(user); router.push("/dashboard"); }
  };

  return (
    <div style={{ height: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", direction: "rtl" }}>
      <div style={{ background: WHITE, borderRadius: 16, padding: 36, width: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, letterSpacing: -0.5 }}>SalesFlow CRM</div>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>Shiluv I²R</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>בחר את המשתמש שלך להתחברות</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {activeUsers.map(u => (
            <div key={u.id}
              onClick={() => { setSelId(u.id); setError(""); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, border: `2px solid ${selId === u.id ? NAVY : BORDER}`, background: selId === u.id ? "#F0F4FF" : WHITE, cursor: "pointer", transition: "all .15s" }}
            >
              <Av name={u.name} size={38} color={isAdminRole(u) ? GOLD : NAVY} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: TEXT, fontSize: 13 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{u.role}</div>
              </div>
              {isAdminRole(u) && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: GOLD + "22", color: WARN }}>מנהל</span>
              )}
              {selId === u.id && (
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: WHITE, fontSize: 11 }}>✓</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {error && <div style={{ fontSize: 12, color: ERR, marginBottom: 10, textAlign: "center" }}>{error}</div>}

        <button
          onClick={handleLogin}
          style={{ width: "100%", padding: "13px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
        >
          כניסה למערכת
        </button>
        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 12 }}>
          ← זהו מוקאפ עיצובי. בגרסה הייצורית יהיה אימות מלא.
        </div>
      </div>
    </div>
  );
}
