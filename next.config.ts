import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@prisma/client", "prisma"],
  // Sub-path deployment behind the portal gateway (e.g. "/crm" or "/crm-test").
  // BUILD-TIME value (baked into the bundle) — set via Docker build-arg; empty = root.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
