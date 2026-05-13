import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ============================================
// CONFIGURACIÓN DE BLOQUEO POR INTENTOS FALLIDOS
// Cambiar estos valores para ajustar la severidad
// ============================================
const MAX_INTENTOS_FALLIDOS = 3
const MINUTOS_BLOQUEO = 1

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        // 1. Buscar el usuario en la base de datos
        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username },
          include: {
            persona:          true,
            rol: {
              include: {
                permisos_rol: true,
              },
            },
            permisos_usuario: true,
          },
        })

        // 2. Si no existe, rechazar
        if (!usuario) return null

        // 3. Si está inactivo, rechazar
        if (!usuario.activo) return null

        // 4. NUEVO — Verificar si la cuenta está bloqueada
        // Si bloqueado_hasta tiene una fecha y esa fecha todavía no llegó,
        // el usuario NO puede intentar entrar, ni siquiera con la contraseña correcta
        if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > new Date()) {
          const horas   = usuario.bloqueado_hasta.getHours().toString().padStart(2, '0')
          const minutos = usuario.bloqueado_hasta.getMinutes().toString().padStart(2, '0')
          throw new Error(
            `Cuenta bloqueada hasta las ${horas}:${minutos}. Intenta mas tarde.`
          )
        }

        // 5. Comparar la contraseña con bcrypt
        const passwordValido = await bcrypt.compare(
          credentials.password,
          usuario.password
        )

        // 6. NUEVO — Si la contraseña es incorrecta, actualizar el contador
        if (!passwordValido) {
          const nuevosIntentos = usuario.intentos_fallidos + 1

          if (nuevosIntentos >= MAX_INTENTOS_FALLIDOS) {
            // Llegó al límite: bloquear la cuenta por X minutos
            const bloqueoHasta = new Date(Date.now() + MINUTOS_BLOQUEO * 60 * 1000)

            await prisma.usuario.update({
              where: { id: usuario.id },
              data: {
                intentos_fallidos: 0,        // resetear el contador para el próximo ciclo
                bloqueado_hasta:   bloqueoHasta,
              },
            })

            const horas   = bloqueoHasta.getHours().toString().padStart(2, '0')
            const minutos = bloqueoHasta.getMinutes().toString().padStart(2, '0')
            throw new Error(
              `Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos tras ${MAX_INTENTOS_FALLIDOS} intentos fallidos. Podes reintentar a las ${horas}:${minutos}.`
            )
          } else {
            // Todavía tiene intentos disponibles: solo incrementar el contador
            await prisma.usuario.update({
              where: { id: usuario.id },
              data: {
                intentos_fallidos: nuevosIntentos,
              },
            })
          }

          return null
        }

        // 7. NUEVO — Contraseña correcta: limpiar intentos acumulados si los había
        // Esto cubre dos casos:
        //   a) El usuario falló 1-2 veces y después acertó → resetear el contador
        //   b) El usuario tenía un bloqueo vencido → limpiar la fecha vieja
        if (usuario.intentos_fallidos > 0 || usuario.bloqueado_hasta !== null) {
          await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
              intentos_fallidos: 0,
              bloqueado_hasta:   null,
            },
          })
        }

        // 8. Cargar permisos base del ROL
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

        // 9. Aplicar overrides individuales del USUARIO
        // Si existe un PermisoUsuario para ese módulo, reemplaza al del rol
        for (const permiso of usuario.permisos_usuario) {
          permisos[permiso.modulo] = {
            puede_ver:      permiso.puede_ver,
            puede_crear:    permiso.puede_crear,
            puede_editar:   permiso.puede_editar,
            puede_eliminar: permiso.puede_eliminar,
            puede_reportes: permiso.puede_reportes,
          }
        }

        // 10. Retornar datos del usuario para la sesión
        return {
          id:                   usuario.id,
          username:             usuario.username,
          nombre:               usuario.persona.nombre,
          apellido:             usuario.persona.apellido,
          rol:                  usuario.rol.nombre,
          sesion_invalidada_en: usuario.sesion_invalidada_en,
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
  },
})

export { handler as GET, handler as POST }