// src/auth.js
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { usuarioTieneCargoDeCascada } from "@/lib/autorizacion"

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

        // 1. Buscar el usuario, con su rol (base Y secundario) y permisos.
        // rol_secundario se agrega acá — nullable, solo trae algo si la
        // persona tiene un turno rotativo activo (ej. Supervisor de Semana).
        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username.trim() },
          include: {
            persona: true,
            rol: {
              include: { permisos_rol: true },
            },
            rol_secundario: {
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

        // 9b. Sumar los permisos del ROL SECUNDARIO, si tiene uno activo
        // y eligió combinarlo con el rol base (rol_secundario_combina).
        // Suma por OR bit a bit — nunca resta nada de lo que ya tenía el
        // rol base, solo agrega lo que le falte.
        if (usuario.rol_secundario && usuario.rol_secundario_combina) {
          for (const permiso of usuario.rol_secundario.permisos_rol) {
            const actual = permisos[permiso.modulo] || {
              puede_ver: false, puede_crear: false, puede_editar: false,
              puede_eliminar: false, puede_reportes: false,
            }
            permisos[permiso.modulo] = {
              puede_ver:      actual.puede_ver      || permiso.puede_ver,
              puede_crear:    actual.puede_crear    || permiso.puede_crear,
              puede_editar:   actual.puede_editar   || permiso.puede_editar,
              puede_eliminar: actual.puede_eliminar || permiso.puede_eliminar,
              puede_reportes: actual.puede_reportes || permiso.puede_reportes,
            }
          }
        }
        // Si rol_secundario_combina es false, el rol secundario
        // REEMPLAZA al base mientras está activo.
        else if (usuario.rol_secundario && !usuario.rol_secundario_combina) {
          for (const permiso of usuario.rol_secundario.permisos_rol) {
            permisos[permiso.modulo] = {
              puede_ver:      permiso.puede_ver,
              puede_crear:    permiso.puede_crear,
              puede_editar:   permiso.puede_editar,
              puede_eliminar: permiso.puede_eliminar,
              puede_reportes: permiso.puede_reportes,
            }
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

        // 11. Flag calculado una sola vez en el login, mismo patrón que
        // esCargoDeCascada (nunca se recalcula durante la sesión).
        // esSupervisorSemana viene del rol_secundario activo. Se usa en
        // Manifiesto y Post-Vuelo para dar cobertura sobre CUALQUIER
        // escala, no solo las propias — ver usuarioPuedeGestionarManifiesto()
        // en lib/manifiesto.js y las funciones equivalentes de postVuelo.js.
        //
        // NOTA: acá NO va un flag "esTecnicoDeVuelo" — se evaluó, pero
        // ninguna regla de negocio termina necesitándolo: Manifiesto
        // depende solo de esSupervisorSemana, y el tripulante de
        // Post-Vuelo se resuelve por escala (esTripulanteDeEscala), no
        // por una bandera global de especialidad.
        const esSupervisorSemana = !!usuario.rol_secundario && usuario.rol_secundario.nombre === "Supervisor de Semana"

        // 12. ¿Tiene potestad de autorizar en la cascada? Se calcula acá,
        // una sola vez, para no volver a consultar CargoAutorizacion en
        // cada request.
        const esCargoDeCascada = await usuarioTieneCargoDeCascada(usuario.id)

        // 13. Retornar datos del usuario para la sesión
        return {
          id:                   usuario.id,
          username:             usuario.username,
          nombre:               usuario.persona.nombre,
          apellido:             usuario.persona.apellido,
          rol:                  usuario.rol.nombre,
          personaId:            usuario.persona.id,
          sesion_invalidada_en: null,
          permisos,
          esSupervisorSemana,
          esCargoDeCascada,
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
        token.personaId            = user.personaId
        token.permisos             = user.permisos
        token.esSupervisorSemana   = user.esSupervisorSemana
        token.esCargoDeCascada     = user.esCargoDeCascada
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
      session.user.personaId            = token.personaId
      session.user.permisos             = token.permisos
      session.user.esSupervisorSemana   = token.esSupervisorSemana
      session.user.esCargoDeCascada     = token.esCargoDeCascada
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