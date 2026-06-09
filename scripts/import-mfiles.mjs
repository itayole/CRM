/**
 * M-Files import — loads the DB import/*.xlsx exports into the CRM database.
 *
 *   node scripts/import-mfiles.mjs --dry-run   # read + report mappings, NO writes
 *   node scripts/import-mfiles.mjs             # write to the DB
 *
 * Idempotent: bulk-inserts into empty tables, upserts by external sync key
 * (mfilesClientNo / projectNo / mfilesId) on re-runs. Account managers are
 * matched to existing CRM users by name, else created as inactive placeholders
 * (synthetic @mfiles.local email) to be reconciled with real AD users later.
 */
import dgram from "dgram";
import path from "path";
import XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const DRY = process.argv.includes("--dry-run");
const DIR = "DB import";

try { process.loadEnvFile(".env"); } catch {}

function discoverPort(host, instance) {
  return new Promise((resolve, reject) => {
    const s = dgram.createSocket("udp4");
    const t = setTimeout(() => { s.close(); reject(new Error("SQL Browser timeout")); }, 5000);
    s.on("message", m => { clearTimeout(t); s.close(); const x = m.toString("ascii").match(/tcp;(\d+)/i); x ? resolve(Number(x[1])) : reject(new Error("instance not found")); });
    s.on("error", e => { clearTimeout(t); s.close(); reject(e); });
    const p = Buffer.concat([Buffer.from([0x04]), Buffer.from(instance, "ascii"), Buffer.from([0x00])]);
    s.send(p, 1434, host, e => { if (e) { clearTimeout(t); s.close(); reject(e); } });
  });
}

// ── value helpers ───────────────────────────────────────────────────────────
const s = v => { if (v === null || v === undefined) return null; const t = String(v).trim(); return t === "" ? null : t; };
const i = v => { const n = parseInt(String(v ?? "").replace(/[^\d-]/g, ""), 10); return Number.isFinite(n) ? n : null; };
const f = v => { const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : null; };
const norm = v => (v == null ? "" : String(v).trim().replace(/\s+/g, " ").toLowerCase());
function date(v) {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const d = new Date(String(v));
  return isNaN(d) ? null : d;
}
function rows(file, sheetName) {
  const wb = XLSX.readFile(path.join(DIR, file), { cellDates: true });
  const ws = sheetName ? wb.Sheets[sheetName] : wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: null }).slice(1);
}
const hash = str => { let h = 5381; for (const c of str) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h.toString(36); };
const synthEmail = name => `am-${hash(norm(name))}@mfiles.local`;

async function bulkLoad(model, records, keyField, label) {
  if (DRY) { console.log(`  [dry] ${label}: ${records.length} rows ready`); return; }
  const existing = await model.count();
  if (existing === 0) {
    let n = 0;
    for (let j = 0; j < records.length; j += 500) {
      const chunk = records.slice(j, j + 500);
      const r = await model.createMany({ data: chunk });
      n += r.count ?? chunk.length;
    }
    console.log(`  ${label}: inserted ${n}`);
  } else {
    let c = 0, u = 0;
    for (const rec of records) {
      const { [keyField]: key, ...rest } = rec;
      const res = await model.upsert({ where: { [keyField]: key }, create: rec, update: rest });
      res ? u++ : c++;
    }
    console.log(`  ${label}: upserted ${records.length} (table had ${existing})`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const m = url.match(/^(sqlserver:\/\/)([^\\;:]+)\\([^;:]+)/);
  let resolved = url;
  if (m) { const [full, proto, host, inst] = m; resolved = url.replace(full, `${proto}${host}:${await discoverPort(host, inst)}`); }
  const prisma = new PrismaClient({ datasources: { db: { url: resolved } } });

  console.log(DRY ? "=== DRY RUN (no writes) ===" : "=== IMPORT (writing to DB) ===");
  try {
    // 1) Lookups
    const products = rows("list of products.xlsx").filter(r => s(r[1])).map(r => ({ mfilesId: i(r[0]), name: s(r[1]) }));
    const rtypes = rows("Research types.xlsx").filter(r => s(r[1])).map(r => ({ mfilesId: i(r[0]), name: s(r[1]) }));
    const rmethods = rows("research methods.xlsx").filter(r => s(r[1])).map(r => ({ mfilesId: i(r[0]), name: s(r[1]) }));
    console.log(`Lookups: ${products.length} products, ${rtypes.length} research types, ${rmethods.length} research methods`);
    await bulkLoad(prisma.product, products, "mfilesId", "products");
    await bulkLoad(prisma.researchType, rtypes, "mfilesId", "research_types");
    await bulkLoad(prisma.researchMethod, rmethods, "mfilesId", "research_methods");

    // 2) Clients
    const clientRecs = rows("List of clients.xlsx").filter(r => s(r[1]) && i(r[0]) != null)
      .map(r => ({ mfilesClientNo: i(r[0]), name: s(r[1]) }));
    // de-dup by name (Client.name is unique) keeping first
    const seenName = new Set();
    const clients = clientRecs.filter(c => { const k = norm(c.name); if (seenName.has(k)) return false; seenName.add(k); return true; });
    console.log(`Clients: ${clients.length} (from ${clientRecs.length}, ${clientRecs.length - clients.length} dup names dropped)`);
    await bulkLoad(prisma.client, clients, "mfilesClientNo", "clients");

    // client name -> id map: from DB (real ids) on a real run; from the parsed
    // list (placeholder id) on a dry run, so the name-match rate is still measured.
    const clientByName = new Map();
    if (DRY) for (const c of clients) clientByName.set(norm(c.name), 1);
    else for (const c of await prisma.client.findMany({ select: { id: true, name: true } })) clientByName.set(norm(c.name), c.id);

    // 3) Account-manager users (match existing by name, else placeholder)
    const existingUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const userByName = new Map(existingUsers.map(u => [norm(u.name), u.id]));
    const mgrNames = new Set();
    const collectMgr = n => { const v = s(n); if (v) mgrNames.add(v); };

    // contacts — single sheet; status derived from the newsletter type column
    const contactRows = rows("Contact people.xlsx");
    for (const r of contactRows) collectMgr(r[9]);
    const statusOf = nt => (s(nt) === "לא לשלוח" ? "unsubscribed" : "active");
    const projectRows = rows("Project list.xlsx");
    for (const r of projectRows) collectMgr(r[7]);

    let matchedMgr = 0, placeholderMgr = 0;
    for (const name of mgrNames) {
      const k = norm(name);
      if (userByName.has(k)) { matchedMgr++; continue; }
      placeholderMgr++;
      if (!DRY) {
        const u = await prisma.user.upsert({
          where: { email: synthEmail(name) },
          update: {},
          create: { name, email: synthEmail(name), role: "sales_rep", active: false, password: null },
        });
        userByName.set(k, u.id);
      } else {
        userByName.set(k, -1);
      }
    }
    console.log(`Account managers: ${mgrNames.size} distinct (${matchedMgr} matched existing users, ${placeholderMgr} ${DRY ? "would be" : ""} created as inactive placeholders)`);
    const mgrId = n => { const v = s(n); return v ? (userByName.get(norm(v)) ?? null) : null; };

    // 4) Contacts (dedup by mfilesId, last wins)
    const contactMap = new Map();
    let cClientMatch = 0, cTotal = 0;
    for (const r of contactRows) {
      const id = i(r[0]);
      if (id == null) continue;
      cTotal++;
      const companyName = s(r[8]);
      const clientId = companyName ? (clientByName.get(norm(companyName)) ?? null) : null;
      if (clientId) cClientMatch++;
      contactMap.set(id, {
        mfilesId: id, fullName: s(r[1]), firstName: s(r[2]),
        newsletterType: s(r[4]), newsletter: s(r[5]) === "כן",
        email: s(r[6]), category: s(r[7]), companyName,
        accountManagerId: mgrId(r[9]), mobile: s(r[10]),
        clientId, status: statusOf(r[4]),
      });
    }
    const contacts = [...contactMap.values()];
    const cLinked = contacts.filter(c => c.clientId != null).length;
    console.log(`Contacts: ${contacts.length} unique (from ${cTotal} sheet rows); ${cLinked} linked to a client, ${contacts.length - cLinked} unmatched`);
    await bulkLoad(prisma.contact, contacts, "mfilesId", "contacts");

    // 5) Projects (dedup by projectNo)
    const projMap = new Map();
    let pClientMatch = 0, pTotal = 0;
    for (const r of projectRows) {
      const no = i(r[0]);
      if (no == null) continue;
      pTotal++;
      const clientName = s(r[6]);
      const clientId = clientName ? (clientByName.get(norm(clientName)) ?? null) : null;
      if (clientId) pClientMatch++;
      projMap.set(no, {
        projectNo: no, name: s(r[1]) ?? `#${no}`, lastUpdated: date(r[2]), state: s(r[3]),
        shiluvNo: s(r[4]), abc: s(r[5]), clientName, clientId, assigneeId: mgrId(r[7]),
        model: s(r[8]), actualEndDate: date(r[9]), proposalDate: date(r[10]), approvalDate: date(r[11]),
        cancelledDate: date(r[12]), billingDate: date(r[13]), billing: f(r[14]), statusText: s(r[15]),
        relevantDate: date(r[16]), tpName: s(r[17]), methodology: s(r[18]), questionsCount: i(r[19]),
        sourceCreatedAt: date(r[20]),
      });
    }
    const projects = [...projMap.values()];
    const pLinked = projects.filter(p => p.clientId != null).length;
    console.log(`Projects: ${projects.length} unique (from ${pTotal} rows); ${pLinked} linked to a client, ${projects.length - pLinked} unmatched`);
    await bulkLoad(prisma.project, projects, "projectNo", "projects");

    console.log(DRY ? "\n=== DRY RUN complete — no data written ===" : "\n=== IMPORT complete ===");
  } catch (e) {
    console.error("IMPORT FAILED:", e.message);
    process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main();
