import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const sessionCookie = getSessionCookie(request);
  const privatePrefixes = [
    "/dashboard",
    "/transacoes",
    "/importar",
    "/patrimonio",
    "/planejamento",
    "/relatorios",
    "/configuracoes",
  ];
  const isPrivate = privatePrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isPrivate && !sessionCookie) {
    const url = new URL("/entrar", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((pathname === "/entrar" || pathname === "/cadastro") && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js).*)"],
};
