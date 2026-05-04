export async function register() {
  // Only runs in the Node.js runtime (not Edge), once per server start
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { resolveDbUrl } = await import("./lib/sql-browser");
    const resolved = await resolveDbUrl(process.env.DATABASE_URL ?? "");
    process.env.DATABASE_URL = resolved;
  }
}
