import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
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

        if (!usuario) return null
        if (!usuario.activo) return null

        const passwordValido = await bcrypt.compare(
          credentials.password,
          usuario.password
        )

        if (!passwordValido) return null

        // Paso 1 — cargamos permisos base del ROL
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

        // Paso 2 — aplicamos overrides individuales del USUARIO
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