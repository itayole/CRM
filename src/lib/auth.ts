import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ldapAuthenticate, ldapEnabled } from "@/lib/ldap";

// When true, a user who binds successfully against AD but has no CRM row yet is
// auto-created as a sales_rep. Admins are still set manually on the users row.
const AUTO_PROVISION = process.env.LDAP_AUTO_PROVISION === "true";

async function finalize(user: User) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email / Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // Hybrid auth: a local bcrypt password (if the row has one) OR an AD/LDAP
      // bind. Either path is accepted, so an admin with a manual password can
      // log in even while LDAPS is still being enabled.
      // Any thrown error here (e.g. Prisma connection failures naming the SQL
      // server and login) would be forwarded by next-auth into the client-visible
      // error redirect URL — so never let raw errors escape this function.
      async authorize(credentials) {
        try {
          const login = credentials?.email?.trim();
          const password = credentials?.password;
          if (!login || !password) return null;

          let user = await prisma.user.findUnique({ where: { email: login } });

          // Inactive accounts are never allowed, regardless of auth method.
          if (user && !user.active) return null;

          // 1) Local password — only if this row actually has a hash set.
          if (user?.password) {
            const ok = await bcrypt.compare(password, user.password);
            if (ok) return finalize(user);
          }

          // 2) AD / LDAP bind.
          if (ldapEnabled() && (await ldapAuthenticate(login, password))) {
            if (!user) {
              if (!AUTO_PROVISION) return null;
              user = await prisma.user.create({
                data: {
                  name: login.split("@")[0],
                  email: login,
                  role: "sales_rep",
                  active: true,
                  password: null,
                },
              });
            }
            return finalize(user);
          }

          return null;
        } catch (err) {
          console.error("authorize() failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};
