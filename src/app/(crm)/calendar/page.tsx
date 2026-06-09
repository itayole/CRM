"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Av, Btn, Input, Select, Modal, FormRow, Field } from "@/components/ui";
import { NAVY, GOLD, BLUE, SURF, WHITE, MUTED, TEXT, BORDER, OK, WARN } from "@/lib/tokens";
import { EVENT_TYPES, HE_MONTHS, HE_DAYS, HE_DAYS_FULL } from "@/lib/mockData";
import { fetchCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, fetchActiveUsers, type CrmCalendarEvent } from "@/lib/api";
import type { Named } from "@/lib/api";

// Timezone-safe day string from local date components (avoids the toISOString
// UTC off-by-one that shifts the day in UTC+ timezones like Israel).
const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const colorForType = (type: string) => (EVENT_TYPES as Record<string, { color: string }>)[type]?.color || MUTED;
const withColor = (e: CrmCalendarEvent): CrmCalendarEvent => ({ ...e, color: e.color || colorForType(e.type) });

export default function CalendarPage() {
  const { activeUser, isAdmin } = useApp();
  const [events, setEvents] = useState<CrmCalendarEvent[]>([]);
  const [users, setUsers] = useState<Named[]>([]);
  const [loadErr, setLoadErr] = useState("");
  const [viewMode, setViewMode] = useState<"day" | "month" | "year">("month");
  const [TODAY] = useState(() => new Date());
  const [curDate, setCurDate]   = useState(() => new Date());
  const [selEvent, setSelEvent] = useState<CrmCalendarEvent | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [editId, setEditId]     = useState<number | null>(null);
  const [saving, setSaving]     = useState(false);
  const [gcModal,  setGcModal]  = useState(false);
  const [gcConnected, setGcConnected] = useState(false);
  const [filterUser, setFilterUser]   = useState("all");

  const emptyForm = { title: "", date: isoDate(TODAY), time: "09:00", endTime: "10:00", type: "meeting", assignee: activeUser?.name || "", client: "", notes: "", location: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchCalendarEvents()
      .then(evs => setEvents(evs.map(withColor)))
      .catch(e => setLoadErr(e instanceof Error ? e.message : "טעינת היומן נכשלה"));
    // Active-user list powers the admin filter + assignee picker (admin-only endpoint → [] for reps).
    if (isAdmin) fetchActiveUsers().then(setUsers).catch(() => setUsers([]));
  }, [isAdmin]);

  // Admin can filter by rep; reps only ever receive their own events from the API.
  const visibleEvents = events.filter(ev => !isAdmin || filterUser === "all" || ev.assignee === filterUser);

  const openEditEvent = (ev: CrmCalendarEvent) => {
    setEditId(ev.id);
    setForm({
      title: ev.title, date: ev.date, time: ev.time || "09:00", endTime: ev.endTime || "10:00",
      type: ev.type, assignee: ev.assignee || activeUser?.name || "", client: ev.client || "",
      notes: ev.notes || "", location: ev.location || "",
    });
    setSelEvent(null);
    setAddModal(true);
  };

  const closeAddModal = () => { setAddModal(false); setEditId(null); setForm(emptyForm); };

  const saveEvent = async () => {
    if (!form.title || !form.date) { alert("כותרת ותאריך הם שדות חובה"); return; }
    // Admin chooses the assignee by name; reps act on their own (server-assigned).
    const assigneeId = isAdmin ? users.find(u => u.name === form.assignee)?.id : undefined;
    const payload = {
      title: form.title, date: form.date, time: form.time || null, endTime: form.endTime || null,
      type: form.type, client: form.client || null, notes: form.notes || null, location: form.location || null,
      color: colorForType(form.type), assigneeId,
    };
    setSaving(true);
    const res = editId ? await updateCalendarEvent(editId, payload) : await createCalendarEvent(payload);
    setSaving(false);
    if (!res.ok || !res.event) { alert(res.message || "שמירת האירוע נכשלה"); return; }
    const saved = withColor(res.event);
    setEvents(p => editId ? p.map(e => e.id === saved.id ? saved : e) : [...p, saved]);
    closeAddModal();
  };

  const deleteEvent = async (id: number) => {
    const prev = events;
    setEvents(p => p.filter(e => e.id !== id)); // optimistic
    setSelEvent(null);
    const res = await deleteCalendarEvent(id);
    if (!res.ok) { setEvents(prev); alert(res.message || "מחיקת האירוע נכשלה"); }
  };

  const navigate = (dir: number) => {
    const d = new Date(curDate);
    if (viewMode === "day")   d.setDate(d.getDate() + dir);
    if (viewMode === "month") d.setMonth(d.getMonth() + dir);
    if (viewMode === "year")  d.setFullYear(d.getFullYear() + dir);
    setCurDate(d);
  };

  const headerTitle = () => {
    if (viewMode === "day")   return (HE_DAYS_FULL as any)[curDate.getDay()] + ", " + curDate.getDate() + " ב" + (HE_MONTHS as any)[curDate.getMonth()] + " " + curDate.getFullYear();
    if (viewMode === "month") return (HE_MONTHS as any)[curDate.getMonth()] + " " + curDate.getFullYear();
    return String(curDate.getFullYear());
  };

  const eventsOn = (dateStr: string) =>
    visibleEvents.filter((e: CrmCalendarEvent) => e.date === dateStr).sort((a: CrmCalendarEvent, b: CrmCalendarEvent) => (a.time || "").localeCompare(b.time || ""));

  const EventChip = ({ ev, compact = false }: { ev: CrmCalendarEvent; compact?: boolean }) => (
    <div onClick={e => { e.stopPropagation(); setSelEvent(ev); }}
      style={{ background: ev.color + "22", borderRight: `3px solid ${ev.color}`, borderRadius: 4, padding: compact ? "2px 5px" : "3px 7px", marginBottom: 2, cursor: "pointer", fontSize: compact ? 10 : 11, color: TEXT, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
      onMouseEnter={e => (e.currentTarget.style.background = ev.color + "44")}
      onMouseLeave={e => (e.currentTarget.style.background = ev.color + "22")}>
      {ev.time && <span style={{ color: ev.color, marginLeft: 4 }}>{ev.time}</span>}
      {ev.title}
    </div>
  );

  const MonthView = () => {
    const year = curDate.getFullYear(), month = curDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: `1px solid ${BORDER}` }}>
          {(HE_DAYS as string[]).map(d => <div key={d} style={{ padding: "8px 0", textAlign: "center", fontSize: 11, fontWeight: 700, color: MUTED }}>{d}</div>)}
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridAutoRows: "1fr", overflow: "hidden" }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={"e" + idx} style={{ borderLeft: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, background: SURF }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvs = eventsOn(dateStr);
            const isToday = isoDate(TODAY) === dateStr;
            return (
              <div key={day} onClick={() => { setCurDate(new Date(year, month, day)); setViewMode("day"); }}
                style={{ borderLeft: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: "4px 5px", overflow: "hidden", cursor: "pointer", background: isToday ? "#F0F4FF" : WHITE }}
                onMouseEnter={e => { if (!isToday) e.currentTarget.style.background = SURF; }}
                onMouseLeave={e => { if (!isToday) e.currentTarget.style.background = WHITE; }}>
                <div style={{ fontSize: 11, fontWeight: isToday ? 800 : 500, width: 20, height: 20, borderRadius: "50%", background: isToday ? BLUE : "transparent", color: isToday ? WHITE : TEXT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 }}>{day}</div>
                {dayEvs.slice(0, 2).map((ev: CrmCalendarEvent) => <EventChip key={ev.id} ev={ev} compact />)}
                {dayEvs.length > 2 && <div style={{ fontSize: 9, color: MUTED, fontWeight: 600 }}>+{dayEvs.length - 2} נוספים</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dateStr = isoDate(curDate);
    const dayEvs  = eventsOn(dateStr);
    const hours   = Array.from({ length: 12 }, (_, i) => i + 8);
    return (
      <div style={{ flex: 1, overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "52px 1fr", borderTop: `1px solid ${BORDER}` }}>
          {hours.map(h => {
            const hStr = String(h).padStart(2, "0") + ":00";
            const slotEvs = dayEvs.filter((ev: CrmCalendarEvent) => ev.time && ev.time.startsWith(String(h).padStart(2, "0")));
            return (
              <div key={h} style={{ display: "contents" }}>
                <div style={{ padding: "10px 6px", borderBottom: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}`, textAlign: "left", fontSize: 10, color: MUTED, fontWeight: 600 }}>{hStr}</div>
                <div style={{ padding: 4, borderBottom: `1px solid ${BORDER}`, minHeight: 44, background: h % 2 === 0 ? WHITE : SURF + "88" }}>
                  {slotEvs.map((ev: CrmCalendarEvent) => (
                    <div key={ev.id} onClick={() => setSelEvent(ev)}
                      style={{ background: ev.color + "22", border: `1px solid ${ev.color}`, borderRight: `4px solid ${ev.color}`, borderRadius: 6, padding: "5px 10px", marginBottom: 3, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      onMouseEnter={e => (e.currentTarget.style.background = ev.color + "44")}
                      onMouseLeave={e => (e.currentTarget.style.background = ev.color + "22")}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>{ev.title}</div>
                        <div style={{ fontSize: 10, color: MUTED }}>{ev.time}{ev.endTime ? " – " + ev.endTime : ""}{ev.client ? " · " + ev.client : ""}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Av name={ev.assignee} size={22} color={NAVY} />
                        <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 8, background: ev.color + "22", color: ev.color }}>{(EVENT_TYPES as any)[ev.type]?.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {dayEvs.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: MUTED, fontSize: 12 }}>
            אין אירועים ביום זה<br />
            <button onClick={() => { setEditId(null); setForm(f => ({ ...f, date: dateStr })); setAddModal(true); }}
              style={{ marginTop: 10, background: NAVY, color: WHITE, border: "none", borderRadius: 7, padding: "7px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ הוסף אירוע</button>
          </div>
        )}
      </div>
    );
  };

  const YearView = () => {
    const year = curDate.getFullYear();
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
          {Array.from({ length: 12 }, (_, m) => {
            const monthEvs = visibleEvents.filter((e: CrmCalendarEvent) => e.date.startsWith(`${year}-${String(m + 1).padStart(2, "0")}`));
            const isCurrentMonth = m === TODAY.getMonth() && year === TODAY.getFullYear();
            return (
              <div key={m} onClick={() => { setCurDate(new Date(year, m, 1)); setViewMode("month"); }}
                style={{ background: isCurrentMonth ? "#F0F4FF" : WHITE, border: `1px solid ${isCurrentMonth ? BLUE : BORDER}`, borderRadius: 9, padding: 12, cursor: "pointer" }}
                onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.06)"; }}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}>
                <div style={{ fontWeight: 700, fontSize: 12, color: isCurrentMonth ? BLUE : TEXT, marginBottom: 8 }}>{(HE_MONTHS as string[])[m]}</div>
                {monthEvs.length === 0
                  ? <div style={{ fontSize: 10, color: MUTED }}>ללא אירועים</div>
                  : monthEvs.slice(0, 3).map((ev: CrmCalendarEvent) => (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: ev.color, flexShrink: 0 }} />
                      <div style={{ fontSize: 10, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                    </div>
                  ))
                }
                {monthEvs.length > 3 && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>+{monthEvs.length - 3} נוספים</div>}
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: 700, color: monthEvs.length > 0 ? BLUE : MUTED }}>{monthEvs.length} אירועים</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {selEvent && (
        <Modal title={selEvent.title} onClose={() => setSelEvent(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 10, background: selEvent.color + "22", color: selEvent.color }}>{(EVENT_TYPES as any)[selEvent.type]?.label}</span>
              {selEvent.client && <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 10, background: SURF, color: TEXT }}>{selEvent.client}</span>}
            </div>
            {([
              ["📅 תאריך", selEvent.date + (selEvent.time ? "  " + selEvent.time + (selEvent.endTime ? " – " + selEvent.endTime : "") : "")],
              ["👤 נציג", selEvent.assignee],
              selEvent.location ? ["📍 מיקום", selEvent.location] : null,
              selEvent.notes ? ["📝 הערות", selEvent.notes] : null,
            ] as ([string, string] | null)[]).filter((item): item is [string, string] => item !== null).map(([label, val]) => (
              <div key={label} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8, fontSize: 12 }}>
                <span style={{ color: MUTED }}>{label}</span>
                <span style={{ color: TEXT, fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <Btn onClick={() => openEditEvent(selEvent)} sm>✎ ערוך</Btn>
              <Btn onClick={() => deleteEvent(selEvent.id)} variant="danger" sm>🗑 מחק</Btn>
              <Btn onClick={() => setSelEvent(null)} variant="secondary" sm>סגור</Btn>
            </div>
          </div>
        </Modal>
      )}

      {addModal && (
        <Modal title={editId ? "✎ עריכת אירוע" : "+ אירוע חדש"} onClose={closeAddModal}>
          <FormRow>
            <Field label="כותרת *"><Input value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="שם האירוע" style={{ width: "100%" }} /></Field>
            <Field label="סוג">
              <Select value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={Object.entries(EVENT_TYPES).map(([k, t]) => ({ value: k, label: (t as any).label }))} style={{ width: "100%" }} />
            </Field>
          </FormRow>
          <FormRow>
            <Field label="תאריך *"><Input value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} type="date" style={{ width: "100%" }} /></Field>
            <Field label="שעת התחלה"><Input value={form.time} onChange={v => setForm(p => ({ ...p, time: v }))} type="time" style={{ width: "100%" }} /></Field>
            <Field label="שעת סיום"><Input value={form.endTime} onChange={v => setForm(p => ({ ...p, endTime: v }))} type="time" style={{ width: "100%" }} /></Field>
          </FormRow>
          <FormRow>
            <Field label="לקוח"><Input value={form.client} onChange={v => setForm(p => ({ ...p, client: v }))} placeholder="שם הלקוח" style={{ width: "100%" }} /></Field>
            <Field label="נציג">
              {isAdmin
                ? <Select value={form.assignee} onChange={v => setForm(p => ({ ...p, assignee: v }))} options={users.map(u => ({ value: u.name, label: u.name }))} style={{ width: "100%" }} />
                : <div style={{ padding: "8px 11px", border: `1px solid ${BORDER}`, borderRadius: 7, fontSize: 12, color: MUTED, background: SURF }}>{activeUser?.name || "—"}</div>}
            </Field>
          </FormRow>
          <div style={{ marginBottom: 10 }}><Field label="מיקום"><Input value={form.location} onChange={v => setForm(p => ({ ...p, location: v }))} placeholder="כתובת / Zoom / טלפון" style={{ width: "100%" }} /></Field></div>
          <div style={{ marginBottom: 12 }}><Field label="הערות"><Input value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} placeholder="הערות נוספות..." style={{ width: "100%" }} /></Field></div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={saveEvent} disabled={saving}>{saving ? "שומר…" : editId ? "✓ עדכן אירוע" : "✓ שמור אירוע"}</Btn><Btn onClick={closeAddModal} variant="secondary">ביטול</Btn></div>
        </Modal>
      )}

      {gcModal && (
        <Modal title="🔗 חיבור Google Calendar" onClose={() => setGcModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: gcConnected ? "#EAF3DE" : SURF, border: `1px solid ${gcConnected ? OK : BORDER}`, borderRadius: 9, padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 24 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>Google Calendar</div>
                <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{gcConnected ? "מחובר — מסנכרן כל 15 דקות" : "לא מחובר"}</div>
              </div>
              {gcConnected
                ? <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, background: "#EAF3DE", color: OK }}>✓ פעיל</span>
                : <Btn onClick={() => setGcConnected(true)} sm>חבר עכשיו</Btn>}
            </div>

            {gcConnected && (
              <div style={{ background: SURF, borderRadius: 8, padding: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: TEXT, marginBottom: 8 }}>הגדרות סנכרון</div>
                {[["כיוון סנכרון", "דו-כיווני (push & pull)"], ["תדירות", "כל 15 דקות"], ["יומן מקושר", "SalesFlow CRM · Shiluv"], ["לשייך לנציג לפי", "אימייל Google"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ color: MUTED }}>{k}</span>
                    <span style={{ color: TEXT, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: SURF, borderRadius: 8, padding: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: TEXT, marginBottom: 8 }}>אינטגרציות יומן נוספות</div>
              {[
                { name: "Outlook / Microsoft 365", icon: "📘", status: "זמין" },
                { name: "Apple Calendar (iCal)", icon: "🍎", status: "זמין" },
                { name: "Calendly", icon: "🗓", status: "בקרוב" },
              ].map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, padding: "8px 10px", background: WHITE, borderRadius: 7, border: `1px solid ${BORDER}` }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: TEXT }}>{s.name}</div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: s.status === "בקרוב" ? SURF : "#E6F1FB", color: s.status === "בקרוב" ? MUTED : BLUE, fontWeight: 600 }}>{s.status}</span>
                  {s.status === "זמין" && <Btn variant="secondary" sm onClick={() => {}}>חבר</Btn>}
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: MUTED, background: "#FAEEDA", borderRadius: 7, padding: 10 }}>
              💡 בגרסה הייצורית: OAuth2 עם Google API, sync דו-כיווני בזמן אמת. כאן זוהי הדגמה ויזואלית של הממשק.
            </div>
          </div>
        </Modal>
      )}

      {/* Toolbar */}
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10, flexShrink: 0, background: WHITE }}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => navigate(-1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 13 }}>‹</button>
          <button onClick={() => setCurDate(TODAY)} style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 11, fontFamily: "inherit" }}>היום</button>
          <button onClick={() => navigate(1)} style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${BORDER}`, background: WHITE, cursor: "pointer", fontSize: 13 }}>›</button>
        </div>

        <div style={{ fontSize: 14, fontWeight: 800, color: TEXT, flex: 1 }}>{headerTitle()}</div>

        {isAdmin && (
          <Select value={filterUser} onChange={setFilterUser}
            options={[{ value: "all", label: "כל הנציגים" }, ...users.map(u => ({ value: u.name, label: u.name }))]}
            style={{ width: 150 }} />
        )}

        <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 7, overflow: "hidden" }}>
          {([["day", "יום"], ["month", "חודש"], ["year", "שנה"]] as [string, string][]).map(([v, l]) => (
            <button key={v} onClick={() => setViewMode(v as any)}
              style={{ padding: "6px 13px", border: "none", background: viewMode === v ? NAVY : WHITE, color: viewMode === v ? WHITE : TEXT, fontSize: 11, fontWeight: viewMode === v ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
          ))}
        </div>

        <Btn onClick={() => { setEditId(null); setForm(emptyForm); setAddModal(true); }}>+ אירוע</Btn>
        <button onClick={() => setGcModal(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", border: `1px solid ${gcConnected ? OK : BORDER}`, borderRadius: 7, background: gcConnected ? "#EAF3DE" : WHITE, cursor: "pointer", fontSize: 11, fontWeight: 600, color: gcConnected ? OK : TEXT, fontFamily: "inherit" }}>
          📅 {gcConnected ? "מחובר" : "חבר Google"}
        </button>
      </div>

      {loadErr && <div style={{ padding: "6px 20px", background: "#FDECEC", color: "#C0392B", fontSize: 11, flexShrink: 0 }}>⚠ {loadErr}</div>}

      {/* Upcoming strip */}
      {viewMode !== "year" && (
        <div style={{ padding: "6px 20px", borderBottom: `1px solid ${BORDER}`, display: "flex", gap: 8, overflowX: "auto", flexShrink: 0, background: SURF }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = new Date(curDate);
            d.setDate(d.getDate() + i);
            const ds = isoDate(d);
            const cnt = eventsOn(ds).length;
            const isActive = isoDate(curDate) === ds;
            return (
              <button key={i} onClick={() => { setCurDate(d); setViewMode("day"); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 10px", borderRadius: 8, border: `1px solid ${isActive ? NAVY : "transparent"}`, background: isActive ? NAVY : "transparent", cursor: "pointer", minWidth: 46 }}>
                <div style={{ fontSize: 10, color: isActive ? WHITE : MUTED }}>{(HE_DAYS as string[])[d.getDay()]}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? WHITE : TEXT }}>{d.getDate()}</div>
                {cnt > 0 && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isActive ? GOLD : BLUE, marginTop: 2 }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* Calendar area */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: viewMode === "year" ? "12px 20px 0" : 0 }}>
        {viewMode === "month" && <MonthView />}
        {viewMode === "day"   && <DayView />}
        {viewMode === "year"  && <YearView />}
      </div>

      {/* Legend */}
      <div style={{ padding: "6px 20px", borderTop: `1px solid ${BORDER}`, display: "flex", gap: 12, flexShrink: 0, background: WHITE, flexWrap: "wrap" }}>
        {Object.entries(EVENT_TYPES).map(([k, t]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: MUTED }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: (t as any).color }} />
            {(t as any).label}
          </div>
        ))}
        <div style={{ marginRight: "auto", fontSize: 10, color: MUTED }}>
          {visibleEvents.length} אירועים {isAdmin && filterUser !== "all" ? `של ${filterUser}` : isAdmin ? "בסך הכל" : `של ${activeUser?.name}`}
        </div>
      </div>
    </div>
  );
}
