import { NextResponse } from "next/server";

// Mock-login mode: auth state lives in client-side AppContext, not a NextAuth
// session token, so the middleware just passes every request through.
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
