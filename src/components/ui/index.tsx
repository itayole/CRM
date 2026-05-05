"use client";

import React from "react";
import { NAVY, GOLD, BLUE, WHITE, MUTED, TEXT, BORDER, OK, WARN, ERR, SURF } from "@/lib/tokens";
import { STAGES } from "@/lib/mockData";

// ── Avatar ──────────────────────────────────────────────────────────────────
export function Av({ name, size = 34, color = BLUE }: { name: string; size?: number; color?: string }) {
  const ini = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: WHITE, fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>
      {ini}
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function Bdg({ label, color = MUTED }: { label: string; color?: string }) {
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: color + "22", color }}>{label}</span>;
}

// ── Stat card ────────────────────────────────────────────────────────────────
export function Stat({ label, value, sub, trend, color = NAVY }: { label: string; value: string | number; sub?: string; trend?: "up" | "down"; color?: string }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: trend === "up" ? OK : trend === "down" ? ERR : MUTED, marginTop: 3, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── Health bar ───────────────────────────────────────────────────────────────
export function HBar({ score }: { score: number }) {
  const c = score >= 80 ? OK : score >= 60 ? WARN : ERR;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: c, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: c, minWidth: 26 }}>{score}%</span>
    </div>
  );
}

// ── Stage tag ────────────────────────────────────────────────────────────────
export function StTag({ sid }: { sid: string }) {
  const s = STAGES.find(x => x.id === sid) || { label: sid, color: MUTED };
  return <Bdg label={s.label} color={s.color} />;
}

// ── Button ───────────────────────────────────────────────────────────────────
export function Btn({ onClick, children, variant = "primary", sm = false, disabled = false }: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  sm?: boolean;
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? NAVY : variant === "danger" ? ERR : WHITE;
  const cl = variant === "primary" || variant === "danger" ? WHITE : TEXT;
  const br = variant === "secondary" ? `1px solid ${BORDER}` : "none";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ background: bg, color: cl, border: br, borderRadius: 7, padding: sm ? "4px 10px" : "8px 14px", fontWeight: 700, fontSize: sm ? 11 : 12, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────────────────────────
export function Input({ value, onChange, placeholder, type = "text", style = {} }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      style={{ padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: TEXT, outline: "none", background: WHITE, fontFamily: "inherit", ...style }}
    />
  );
}

// ── Select ───────────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, style = {} }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: TEXT, background: WHITE, fontFamily: "inherit", ...style }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 480 }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, direction: "rtl" }}>
      <div style={{ background: WHITE, borderRadius: 12, padding: 24, width, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: TEXT }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: MUTED }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Form row ─────────────────────────────────────────────────────────────────
export function FormRow({ children }: { children: React.ReactNode }) {
  const count = Array.isArray(children) ? children.length : 1;
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 10, marginBottom: 10 }}>{children}</div>;
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ fontSize: 11, fontWeight: 600, color: MUTED, display: "block", marginBottom: 4 }}>{label}</label>{children}</div>;
}

// ── Page shell ───────────────────────────────────────────────────────────────
export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "16px 20px", overflowY: "auto", height: "100%", direction: "rtl" }}>
      {children}
    </div>
  );
}

// ── Section heading ──────────────────────────────────────────────────────────
export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: TEXT }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 10, ...style }}>
      {children}
    </div>
  );
}

// ── Tab bar ──────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }: { tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 2, background: SURF, borderRadius: 8, padding: 3, marginBottom: 14, width: "fit-content" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: active === t.id ? WHITE : "transparent", color: active === t.id ? TEXT : MUTED, fontWeight: active === t.id ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit", boxShadow: active === t.id ? "0 1px 3px rgba(0,0,0,.08)" : "none" }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
