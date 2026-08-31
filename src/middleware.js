import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import prisma from "@/lib/prisma"

// Prisma necesita runtime de Node, no Edge (el default de middleware).
export const runtime = "nodejs"

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

  // ¿Alguien invalidó esta sesión DESPUÉS de que se emitió este token?
  // Pasa cuando cambia el rol principal, el rol secundario, o se
  // desactiva la cuenta — todos esos casos ya escriben
  // sesion_invalidada_en en usuarios/[id]/route.js. Lo que faltaba era
  // este chequeo: sin él, el token seguía siendo válido para siempre,
  // con los permisos viejos congelados adentro, sin importar cuántas
  // veces se refresque la página.
  const usuario = await prisma.usuario.findUnique({
    where: { id: token.id },
    select: { activo: true, sesion_invalidada_en: true },
  })

  const sesionInvalidada =
    !usuario ||
    !usuario.activo ||
    (usuario.sesion_invalidada_en && usuario.sesion_invalidada_en.getTime() / 1000 > token.iat)

  if (sesionInvalidada) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Tu sesión ya no es válida — volvé a iniciar sesión" }, { status: 401 })
    }
    const url = new URL("/login", request.url)
    url.searchParams.set("motivo", "sesion_actualizada")
    const respuesta = NextResponse.redirect(url)
    // Borra la cookie de sesión — si no, el próximo request vuelve a
    // traer el mismo token viejo y entra en loop de redirección.
    respuesta.cookies.delete("next-auth.session-token")
    respuesta.cookies.delete("__Secure-next-auth.session-token")
    return respuesta
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}