// Seeds default configuration (pipeline + stages, and taxonomy options) from the
// values that were previously hardcoded in src/lib/mockData.ts. Idempotent:
// pipelines are only created if none exist; config options are upserted by key.
import dgram from "dgram";
import { PrismaClient } from "@prisma/client";

try { process.loadEnvFile(".env"); } catch {}

function discoverPort(host, instance) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");
    const timer = setTimeout(() => { socket.close(); reject(new Error("SQL Browser timeout")); }, 5000);
    socket.on("message", (msg) => {
      clearTimeout(timer); socket.close();
      const m = msg.toString("ascii").match(/tcp;(\d+)/i);
      m ? resolve(Number(m[1])) : reject(new Error("instance not found"));
    });
    socket.on("error", (e) => { clearTimeout(timer); socket.close(); reject(e); });
    const payload = Buffer.concat([Buffer.from([0x04]), Buffer.from(instance, "ascii"), Buffer.from([0x00])]);
    socket.send(payload, 1434, host, (e) => { if (e) { clearTimeout(timer); socket.close(); reject(e); } });
  });
}

const url = process.env.DATABASE_URL ?? "";
const match = url.match(/^(sqlserver:\/\/)([^\\;:]+)\\([^;:]+)/);
let resolved = url;
if (match) {
  const [full, proto, host, instance] = match;
  resolved = url.replace(full, `${proto}${host}:${await discoverPort(host, instance)}`);
}

const STAGES = [
  { label: "ליד חדש",     order: 0, color: "#7B8FA6", probability: 10 },
  { label: "גילוי צרכים", order: 1, color: "#5B8DEF", probability: 30 },
  { label: "הצעת מחיר",   order: 2, color: "#C9A84C", probability: 50 },
  { label: "משא ומתן",    order: 3, color: "#E0703A", probability: 75 },
  { label: "נסגר ✓",      order: 4, color: "#1E8C5A", probability: 100, isWon: true },
];

const OPTIONS = {
  lead_status: [
    { key: "new", label: "חדש", color: "#5B8DEF" },
    { key: "contacted", label: "פנייה", color: "#D48B1A" },
    { key: "qualified", label: "מוסמך", color: "#1E8C5A" },
    { key: "disqualified", label: "נפסל", color: "#C0392B" },
  ],
  lead_source: [
    { key: "linkedin", label: "LinkedIn" },
    { key: "web_form", label: "Web Form" },
    { key: "email", label: "Email" },
    { key: "meta_ads", label: "Meta Ads" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "referral", label: "המלצה" },
  ],
  task_type: [
    { key: "call", label: "שיחה" },
    { key: "email", label: "מייל" },
    { key: "meeting", label: "פגישה" },
    { key: "proposal", label: "הצעת מחיר" },
    { key: "followup", label: "מעקב" },
    { key: "other", label: "אחר" },
  ],
  project_status: [
    { key: "planning", label: "תכנון" },
    { key: "active", label: "פעיל" },
    { key: "paused", label: "מושהה" },
    { key: "completed", label: "הושלם" },
  ],
};

const prisma = new PrismaClient({ datasources: { db: { url: resolved } } });
try {
  // Pipeline + stages — only if none exist (don't clobber admin edits).
  const existing = await prisma.pipeline.count();
  if (existing === 0) {
    await prisma.pipeline.create({
      data: {
        name: "צינור מכירות ראשי",
        isDefault: true,
        order: 0,
        active: true,
        stages: { create: STAGES },
      },
    });
    console.log("PIPELINE_SEEDED: צינור מכירות ראשי + " + STAGES.length + " stages");
  } else {
    console.log("PIPELINE_SKIPPED: " + existing + " pipeline(s) already exist");
  }

  // Taxonomy options — upsert by (category, key).
  let count = 0;
  for (const [category, items] of Object.entries(OPTIONS)) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await prisma.configOption.upsert({
        where: { category_key: { category, key: it.key } },
        update: { label: it.label, color: it.color ?? null, order: i },
        create: { category, key: it.key, label: it.label, color: it.color ?? null, order: i, active: true },
      });
      count++;
    }
  }
  console.log("OPTIONS_UPSERTED: " + count + " across " + Object.keys(OPTIONS).length + " categories");
} catch (e) {
  console.error("SEED_FAILED:", e.message);
  process.exit(2);
} finally {
  await prisma.$disconnect();
}
