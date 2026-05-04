/**
 * Resolves the SQL Server named instance port via SQL Browser (UDP 1434),
 * then runs any prisma CLI command with the resolved DATABASE_URL injected.
 *
 * Usage (via npm scripts):
 *   node scripts/resolve-port.mjs db push
 *   node scripts/resolve-port.mjs migrate deploy
 */
import dgram from "dgram";
import { execSync } from "child_process";

// Node 20.6+ built-in — no dotenv package needed
try { process.loadEnvFile(".env"); } catch { /* .env may not exist in CI */ }

function discoverPort(host, instance) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket("udp4");

    const timer = setTimeout(() => {
      socket.close();
      reject(new Error(`SQL Browser timeout on ${host}:1434`));
    }, 5000);

    socket.on("message", (msg) => {
      clearTimeout(timer);
      socket.close();
      const text = msg.toString("ascii");
      const match = text.match(/tcp;(\d+)/i);
      if (match) resolve(Number(match[1]));
      else reject(new Error(`Instance "${instance}" not found in SQL Browser response`));
    });

    socket.on("error", (err) => { clearTimeout(timer); socket.close(); reject(err); });

    const payload = Buffer.concat([
      Buffer.from([0x04]),
      Buffer.from(instance, "ascii"),
      Buffer.from([0x00]),
    ]);
    socket.send(payload, 1434, host, (err) => {
      if (err) { clearTimeout(timer); socket.close(); reject(err); }
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const match = url.match(/^(sqlserver:\/\/)([^\\;:]+)\\([^;:]+)/);

  let resolved = url;
  if (match) {
    const [full, proto, host, instance] = match;
    const port = await discoverPort(host, instance);
    resolved = url.replace(full, `${proto}${host}:${port}`);
    console.log(`[resolve-port] ${host}\\${instance} → port ${port}`);
  }

  const args = process.argv.slice(2).join(" ");
  execSync(`npx prisma ${args}`, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: resolved },
  });
}

main().catch((err) => { console.error(err.message); process.exit(1); });
