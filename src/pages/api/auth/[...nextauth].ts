import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isAdminEmail } from "@/lib/admin-config";
import { clearLoginAttempts, consumeLoginAttempt } from "@/lib/rate-limiter";
import { isPasswordVersionCurrent, passwordVersion } from "@/lib/session-security";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: `${basePath}/login` },
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
  logger: {
    error: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('NextAuth Error:', code, metadata);
      } else {
        console.error('NextAuth Error:', code);
      }
    },
    warn: (code) => {
      console.warn('NextAuth Warning:', code);
    },
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
      }
    },
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        try {
          const email = (credentials?.email ?? "").toString().trim().toLowerCase();
          const password = (credentials?.password ?? "").toString();
          
          if (!email || !password || email.length > 254 || password.length > 128) {
            return null;
          }

          const cloudflareIP = request.headers?.['cf-connecting-ip'];
          const forwarded = request.headers?.['x-forwarded-for'];
          const ipHeader = cloudflareIP || forwarded || request.headers?.['x-real-ip'] || 'unknown';
          const ip = Array.isArray(ipHeader) ? ipHeader[0] : String(ipHeader).split(',')[0].trim();
          const loginKey = `${ip}:${email}`;
          const accountKey = `account:${email}`;
          const ipKey = `ip:${ip}`;
          if (!consumeLoginAttempt(ipKey) || !consumeLoginAttempt(accountKey) || !consumeLoginAttempt(loginKey)) return null;

          const user = await prisma.user.findFirst({
            where: { email: { equals: email, mode: 'insensitive' } },
          });
          if (!user) {
            return null;
          }
          
          if (!user.password) {
            return null;
          }

          const ok = await bcrypt.compare(password, user.password);
          if (!ok) {
            return null;
          }

          clearLoginAttempts(loginKey);
          clearLoginAttempts(accountKey);
          return {
            id: user.id,
            email: user.email,
            name: user.name ?? user.email,
            passwordVersion: passwordVersion(user.password),
          };
        } catch (error) {
          console.error('NextAuth: Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
        (token as any).isAdmin = isAdminEmail(user.email);
        token.passwordVersion = (user as any).passwordVersion;
      }

      if (token?.id) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { activeHouseholdId: true, name: true, email: true, password: true },
        });
        if (!u || !isPasswordVersionCurrent(token.passwordVersion, u.password)) {
          return { invalidated: true };
        }
        (token as any).activeHouseholdId = u?.activeHouseholdId ?? null;
        token.name = u.name ?? u.email;
        token.email = u.email;
        (token as any).isAdmin = isAdminEmail(u?.email ?? (token.email as string) ?? null);
      }

      return token;
    },

    async session({ session, token }) {
      if (token.invalidated === true) {
        (session as any).user = null;
        return session;
      }
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        (session.user as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
        (session.user as any).isAdmin = (token as any).isAdmin === true;
        (session as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
