import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request) {
  const token = await getToken({
    req:    request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    // Sin sesión: a las rutas de API les respondemos 401 en JSON (cada
    // route.js ya tiene su propio candado con conPermiso/conAdmin/
    // conCascada/conSesion — esto es una capa de respaldo, no el
    // chequeo fino de permiso). A las páginas les seguimos redirigiendo
    // a /login, que es la experiencia normal de navegación.
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}