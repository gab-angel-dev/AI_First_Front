import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

// ─── Tipos ────────────────────────────────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
    };
  }
  interface User {
    id: string;
    name: string;
    email: string;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const authOptions: NextAuthOptions = {
  // Sessão via JWT (stateless — não precisa de tabela de sessões)
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 horas — equivale a um turno de trabalho
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await query(
          `SELECT id, name, email, password, active
           FROM admin_users
           WHERE email = $1
           LIMIT 1`,
          [credentials.email.toLowerCase().trim()]
        );

        const user = result.rows[0] as {
          id: string;
          name: string;
          email: string;
          password: string;
          active: boolean;
        } | undefined;

        if (!user || !user.active) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // Na primeira autenticação, `user` está presente — salva no token
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Repassa os dados do token para a session
      session.user = {
        id: token.id as string,
        name: token.name as string,
        email: token.email as string,
      };
      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,

  // Logs de erro em desenvolvimento apenas
  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);