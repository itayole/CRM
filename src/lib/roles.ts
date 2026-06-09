// The two fixed CRM roles. Stored as English keys; shown with Hebrew labels.
export const ROLES = [
  { value: "admin", label: "מנהל מערכת" },
  { value: "sales_rep", label: "נציג מכירות" },
] as const;

export type RoleValue = (typeof ROLES)[number]["value"];

export function roleLabel(role: string): string {
  return ROLES.find(r => r.value === role)?.label ?? role;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin";
}
