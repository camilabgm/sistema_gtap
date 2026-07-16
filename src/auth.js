// src/auth.js
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"


const MAX_INTENTOS_FALLIDOS = 3
const MINUTOS_BLOQUEO = 15

function obtenerIP(req) {
  try {
    if (req?.headers?.get) {
      return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
             req.headers.get("x-real-ip") ||
             "desconocida"
    }
    if (req?.headers?.["x-forwarded-for"]) {
      return req.headers["x-forwarded-for"].split(",")[0].trim()
    }
    return "desconocida"
  } catch {
    return "desconocida"
  }
}

async function registrarIntentoLogin(username, resultado, ip) {
  try {
    await prisma.logIntentoLogin.create({
      data: { username, resultado, ip },
    })
  } catch (error) {
    console.error("Error al registrar intento de login:", error)
  }
}

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, req) {
        const ip = obtenerIP(req)

        // 1. Buscar el usuario, con su rol y permisos
        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username.trim() },
          include: {
            persona: true,
            rol: {
              include: { permisos_rol: true },
            },
            permisos_usuario: true,
          },
        })

        // 2. Si no existe, rechazar y registrar
        if (!usuario) {
          await registrarIntentoLogin(credentials.username, "USUARIO_NO_EXISTE", ip)
          return null
        }

        // 3. Si está inactivo, rechazar y registrar
        if (!usuario.activo) {
          await registrarIntentoLogin(credentials.username, "CUENTA_INACTIVA", ip)
          return null
        }

        // 4. Si está bloqueado, rechazar y registrar
        if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
          await registrarIntentoLogin(credentials.username, "CUENTA_BLOQUEADA", ip)
          const horas   = usuario.bloqueado_hasta.getHours().toString().padStart(2, "0")
          const minutos = usuario.bloqueado_hasta.getMinutes().toString().padStart(2, "0")
          throw new Error(
            `Cuenta bloqueada hasta las ${horas}:${minutos}. Intenta mas tarde.`
          )
        }

        // 5. Comparar la contraseña con bcrypt
        const passwordValido = await bcrypt.compare(
          credentials.password.trim(),
          usuario.password
        )

        // 6. Si la contraseña es incorrecta, actualizar contador y registrar
        if (!passwordValido) {
          const nuevosIntentos = usuario.intentos_fallidos + 1

          if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
            const bloqueoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000)

            await prisma.usuario.update({
              where: { id: usuario.id },
              data: {
                intentos_fallidos: 0,
                bloqueado_hasta:   bloqueoHasta,
              },
            })

            await registrarIntentoLogin(credentials.username, "CREDENCIALES_INVALIDAS", ip)

            const horas   = bloqueoHasta.getHours().toString().padStart(2, "0")
            const minutos = bloqueoHasta.getMinutes().toString().padStart(2, "0")
            throw new Error(
              `Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Podes reintentar a las ${horas}:${minutos}.`
            )
          } else {
            await prisma.usuario.update({
              where: { id: usuario.id },
              data: { intentos_fallidos: nuevosIntentos },
            })
            await registrarIntentoLogin(credentials.username, "CREDENCIALES_INVALIDAS", ip)
          }

          return null
        }

        // 7. Login exitoso: limpiar intentos, bloqueo y sesión invalidada
        if (
          usuario.intentos_fallidos > 0     ||
          usuario.bloqueado_hasta   !== null ||
          usuario.sesion_invalidada_en !== null
        ) {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
              intentos_fallidos:    0,
              bloqueado_hasta:      null,
              sesion_invalidada_en: null,
            },
          })
        }

        // 8. Registrar login exitoso
        await registrarIntentoLogin(credentials.username, "EXITOSO", ip)

        // 9. Cargar permisos base del ROL
        const permisos = {}
        for (const permiso of usuario.rol.permisos_rol) {
          permisos[permiso.modulo] = {
            puede_ver:      permiso.puede_ver,
            puede_crear:    permiso.puede_crear,
            puede_editar:   permiso.puede_editar,
            puede_eliminar: permiso.puede_eliminar,
            puede_reportes: permiso.puede_reportes,
          }
        }

        // 10. Aplicar overrides individuales del USUARIO
        for (const permiso of usuario.permisos_usuario) {
          permisos[permiso.modulo] = {
            puede_ver:      permiso.puede_ver,
            puede_crear:    permiso.puede_crear,
            puede_editar:   permiso.puede_editar,
            puede_eliminar: permiso.puede_eliminar,
            puede_reportes: permiso.puede_reportes,
          }
        }

        // 11. Retornar datos del usuario para la sesión
        return {
          id:                   usuario.id,
          username:             usuario.username,
          nombre:               usuario.persona.nombre,
          apellido:             usuario.persona.apellido,
          rol:                  usuario.rol.nombre,
          sesion_invalidada_en: null,
          permisos,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id                   = user.id
        token.username             = user.username
        token.nombre               = user.nombre
        token.apellido             = user.apellido
        token.rol                  = user.rol
        token.permisos             = user.permisos
        token.sesion_invalidada_en = user.sesion_invalidada_en
        token.iat                  = Math.floor(Date.now() / 1000)
      }
      return token
    },
    async session({ session, token }) {
      session.user.id                   = token.id
      session.user.username             = token.username
      session.user.nombre               = token.nombre
      session.user.apellido             = token.apellido
      session.user.rol                  = token.rol
      session.user.permisos             = token.permisos
      session.user.sesion_invalidada_en = token.sesion_invalidada_en
      session.user.token_emitido_en     = token.iat
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
}

export default NextAuth(authOptions)