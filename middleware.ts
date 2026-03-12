import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Usuário autenticado — deixa passar
    return NextResponse.next();
  },
  {
    callbacks: {
      // Retorna true = deixa passar | false = redireciona para /login
      authorized({ token }) {
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    /*
     * Protege TODAS as rotas exceto:
     * - /login (página de auth)
     * - /api/auth/* (callbacks do NextAuth)
     * - /api/scheduler/webhook (webhook externo — protegido por secret próprio)
     * - /_next/* (assets do Next.js)
     * - /favicon.ico, imagens estáticas
     */
    "/((?!login|api/auth|api/scheduler/webhook|_next/static|_next/image|favicon.ico).*)",
  ],
};