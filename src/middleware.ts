import { withAuth } from "next-auth/middleware";

// Server-side route protection. Pages require a valid NextAuth JWT; admin-only
// sections additionally require role === "admin". API routes are excluded here
// and enforce their own auth via getServerSession (so they return JSON 401s
// rather than HTML redirects).
const ADMIN_PATHS = ["/users", "/integrations", "/import", "/automations", "/settings"];

export default withAuth({
  pages: { signIn: "/login" },
  callbacks: {
    authorized: ({ token, req }) => {
      if (!token) return false;
      const path = req.nextUrl.pathname;
      if (ADMIN_PATHS.some(p => path === p || path.startsWith(p + "/"))) {
        return token.role === "admin";
      }
      return true;
    },
  },
});

export const config = {
  // Protect everything except: the login page, all /api routes (self-guarded),
  // NextAuth assets, and Next.js internals/static files.
  matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"],
};
