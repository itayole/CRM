import { Client } from "ldapts";

/**
 * Active Directory / LDAP authentication via a simple bind.
 *
 * We validate credentials by binding to the DC as the user — a successful bind
 * means the password is correct. Roles are NOT read from AD groups (they are
 * managed manually on the CRM `users` row), so no directory search is needed.
 *
 * Config (env):
 *   LDAP_URL        ldap://172.28.10.1:389 (dev) | ldaps://dc.shiluv.co.il:636 (prod)
 *   LDAP_UPN_SUFFIX shiluv.co.il   — appended to a bare username to form a UPN
 *   LDAP_NETBIOS    SHILUV         — used when LDAP_BIND_MODE=netbios
 *   LDAP_BIND_MODE  "upn" (default) | "netbios"
 *   LDAP_TLS_REJECT_UNAUTHORIZED  "false" to accept a self-signed DC cert over ldaps://
 */
const LDAP_URL = process.env.LDAP_URL;
const UPN_SUFFIX = process.env.LDAP_UPN_SUFFIX;
const NETBIOS = process.env.LDAP_NETBIOS;
const BIND_MODE = (process.env.LDAP_BIND_MODE ?? "upn").toLowerCase();

export function ldapEnabled(): boolean {
  return Boolean(LDAP_URL);
}

/** Turn a login identifier into the DN/UPN/NetBIOS string the DC expects. */
function bindIdentity(login: string): string {
  // Already a full UPN (user@domain) or NetBIOS (DOMAIN\user) — use verbatim.
  if (login.includes("@") || login.includes("\\")) return login;
  if (BIND_MODE === "netbios" && NETBIOS) return `${NETBIOS}\\${login}`;
  if (UPN_SUFFIX) return `${login}@${UPN_SUFFIX}`;
  return login;
}

/**
 * Returns true if the credentials bind successfully against the DC.
 * Never throws — any failure (bad password, unreachable DC, timeout) → false.
 */
export async function ldapAuthenticate(login: string, password: string): Promise<boolean> {
  if (!LDAP_URL || !password) return false;

  const isLdaps = LDAP_URL.toLowerCase().startsWith("ldaps");
  const client = new Client({
    url: LDAP_URL,
    timeout: 5000,
    connectTimeout: 5000,
    ...(isLdaps
      ? { tlsOptions: { rejectUnauthorized: process.env.LDAP_TLS_REJECT_UNAUTHORIZED !== "false" } }
      : {}),
  });

  try {
    await client.bind(bindIdentity(login), password);
    return true;
  } catch {
    return false;
  } finally {
    try { await client.unbind(); } catch { /* ignore */ }
  }
}
