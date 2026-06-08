"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useApp } from "@/context/AppContext";
import { NAVY, GOLD, WHITE, TEXT, MUTED, BORDER, ERR } from "@/lib/tokens";

export default function LoginPage() {
  const { currentUser, authLoading } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in → go straight to the dashboard.
  useEffect(() => {
    if (!authLoading && currentUser) router.replace("/dashboard");
  }, [authLoading, currentUser, router]);

  const handleLogin = async () => {
    if (!email || !password) { setError("נא להזין שם משתמש וסיסמה"); return; }
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { redirect: false, email, password });
    setBusy(false);
    if (res?.ok) {
      router.replace("/dashboard");
    } else {
      setError("שם המשתמש או הסיסמה שגויים");
    }
  };

  return (
    <div style={{ height: "100vh", background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI','Helvetica Neue',Arial,sans-serif", direction: "rtl" }}>
      <div style={{ background: WHITE, borderRadius: 16, padding: 36, width: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: NAVY, letterSpacing: -0.5 }}>SalesFlow CRM</div>
          <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>Shiluv I²R</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 10 }}>התחברות למערכת</div>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleLogin(); }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 5 }}>שם משתמש / דוא״ל</label>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                autoFocus
                placeholder="itay-admin@shiluv.co.il"
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, color: TEXT, outline: "none", fontFamily: "inherit", direction: "ltr", textAlign: "left" }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 5 }}>סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 13, color: TEXT, outline: "none", fontFamily: "inherit", direction: "ltr", textAlign: "left" }}
              />
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: ERR, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button
            type="submit"
            disabled={busy}
            style={{ width: "100%", padding: "13px 0", background: NAVY, color: WHITE, border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: busy ? "default" : "pointer", fontFamily: "inherit", opacity: busy ? 0.7 : 1 }}
          >
            {busy ? "מתחבר…" : "כניסה למערכת"}
          </button>
        </form>

        <div style={{ fontSize: 11, color: MUTED, textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
          התחברות מאומתת מול Active Directory<br />או סיסמה מקומית
        </div>
      </div>
    </div>
  );
}
