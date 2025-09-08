import type { NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" },
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
  logger: {
    error: (code, metadata) => {
      console.error('NextAuth Error:', code, metadata);
    },
    warn: (code) => {
      console.warn('NextAuth Warning:', code);
    },
    debug: (code, metadata) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata);
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
      async authorize(credentials) {
        try {
          const email = (credentials?.email ?? "").toString().trim();
          const password = (credentials?.password ?? "").toString();
          
          if (!email || !password) {
            console.log('NextAuth: Missing email or password');
            return null;
          }

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            console.log('NextAuth: User not found:', email);
            return null;
          }
          
          if (!user.password) {
            console.log('NextAuth: User has no password set:', email);
            return null;
          }

          const ok = await bcrypt.compare(password, user.password);
          if (!ok) {
            console.log('NextAuth: Invalid password for:', email);
            return null;
          }

          console.log('NextAuth: Successful login for:', email);
          return { id: user.id, email: user.email, name: user.name ?? user.email };
        } catch (error) {
          console.error('NextAuth: Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as any).id;
        token.email = user.email;
        token.name = user.name;
      }

      if (token?.id && (user || trigger === "update")) {
        const u = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { activeHouseholdId: true },
        });
        (token as any).activeHouseholdId = u?.activeHouseholdId ?? null;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string;
        session.user.email = (token.email as string) ?? "";
        session.user.name = (token.name as string) ?? "";
        (session.user as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
        (session as any).activeHouseholdId = (token as any).activeHouseholdId ?? null;
      }
      return session;
    },
  },
};

export default NextAuth(authOptions);
