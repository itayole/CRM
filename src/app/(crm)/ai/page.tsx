"use client";

import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Btn } from "@/components/ui";
import { NAVY, GOLD, SURF, WHITE, MUTED, TEXT, BORDER, OK } from "@/lib/tokens";

const SUGGS = ["כמה עסקאות פתוחות?", "כתוב מייל מעקב ל-FinanceHub", "מי הנציג הכי טוב?", "Next Best Action ל-StartupX"];

export default function AIPage() {
  const { visibleLeads: leads, visibleDeals: deals } = useApp();
  const [prompt, setPrompt] = useState("");
  const [msgs, setMsgs] = useState([{
    role: "assistant",
    content: "שלום! אני ה-AI Assistant של SalesFlow CRM.\n\nאני יכול לעזור עם:\n• שאלות על נתוני ה-CRM\n• כתיבת אימיילים ללקוחות\n• המלצות אסטרטגיות\n• ניתוח ביצועים\n\nשאל אותי כל שאלה!"
  }]);
  const [loading, setLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [msgs, loading]);

  const send = async () => {
    if (!prompt.trim() || loading) return;
    const q = prompt.trim();
    setPrompt("");
    const nm = [...msgs, { role: "user", content: q }];
    setMsgs(nm);
    setLoading(true);
    const pipe = deals.filter(d => !d.stage.includes("closed")).reduce((s, d) => s + d.value, 0);
    const sys = `אתה AI Assistant של SalesFlow CRM של Shiluv I²R. נתוני CRM: ${leads.length} לידים, Pipeline ₪${pipe.toLocaleString()}, ${deals.filter(d => d.stage === "closed_won").length} עסקאות שנסגרו. ענה בעברית, קצר ומקצועי.`;
    try {
      const r = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system: sys, messages: nm }),
      });
      const data = await r.json();
      setMsgs(m => [...m, { role: "assistant", content: data.content || data.error || "שגיאה בתגובה" }]);
    } catch {
      setMsgs(m => [...m, { role: "assistant", content: "שגיאה בחיבור ל-AI. בדוק את מפתח ה-API." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: NAVY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>✦</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>AI Assistant</div>
          <div style={{ fontSize: 11, color: MUTED }}>מופעל על ידי Claude · Anthropic</div>
        </div>
        <div style={{ marginRight: "auto", display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: OK }} />
          <span style={{ fontSize: 11, color: OK, fontWeight: 600 }}>מחובר</span>
        </div>
      </div>

      {/* Suggestion chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12, flexShrink: 0 }}>
        {SUGGS.map(s => (
          <button key={s} onClick={() => setPrompt(s)}
            style={{ fontSize: 11, padding: "5px 12px", border: `1px solid ${BORDER}`, borderRadius: 20, background: WHITE, color: TEXT, cursor: "pointer", fontFamily: "inherit" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Chat history */}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-start" : "flex-end" }}>
            <div style={{
              maxWidth: "72%", padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
              background: m.role === "user" ? NAVY : WHITE,
              border: m.role === "assistant" ? `1px solid ${BORDER}` : "none",
              fontSize: 12, color: m.role === "user" ? WHITE : TEXT, lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ padding: "10px 14px", background: WHITE, border: `1px solid ${BORDER}`, borderRadius: "12px 12px 12px 4px", fontSize: 12, color: MUTED }}>
              מחשב...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="שאל אותי כל שאלה על ה-CRM..."
          style={{ flex: 1, padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: 9, fontSize: 12, color: TEXT, outline: "none", fontFamily: "inherit", background: WHITE }}
        />
        <Btn onClick={send} disabled={!prompt.trim() || loading}>
          {loading ? "..." : "שלח ↵"}
        </Btn>
      </div>
      <div style={{ fontSize: 10, color: MUTED, textAlign: "center", marginTop: 6, flexShrink: 0 }}>
        ✦ Claude claude-sonnet-4-6 · Anthropic · שיחות אינן נשמרות
      </div>
    </div>
  );
}
