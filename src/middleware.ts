import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Routes only accessible by admin role
const ADMIN_ONLY_PATHS = [
  "/api/users",
  "/api/automations",
  "/api/integrations",
  "/settings/users",
  "/settings/automations",
  "/settings/integrations",
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const isAdminRoute = ADMIN_ONLY_PATHS.some((path) =>
      pathname.startsWith(path)
    );

    if (isAdminRoute && token.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true to allow the middleware function above to run;
      // withAuth handles the redirect to /login when token is absent.
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    // Protect all routes except public ones
    "/((?!login|_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
