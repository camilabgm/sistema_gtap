import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
            persona: true,
            rol:     true,
            nivel:   {
              include: {
                permisos: true,
              },
            },
          },
        });

        if (!usuario) return null;
        if (!usuario.activo) return null;

        const passwordValido = await bcrypt.compare(
          credentials.password,
          usuario.password
        );

        if (!passwordValido) return null;

        // Convertimos el array de permisos en un objeto organizado por módulo
        const permisos = {}
        for (const permiso of usuario.nivel.permisos) {
          permisos[permiso.modulo] = {
            puede_ver:      permiso.puede_ver,
            puede_crear:    permiso.puede_crear,
            puede_editar:   permiso.puede_editar,
            puede_eliminar: permiso.puede_eliminar,
            puede_reportes: permiso.puede_reportes,
          }
        }

        return {
          id:       usuario.id,
          username: usuario.username,
          nombre:   usuario.persona.nombre,
          apellido: usuario.persona.apellido,
          rol:      usuario.rol.nombre,
          nivel:    usuario.nivel.nivel,
          permisos,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id       = user.id;
        token.username = user.username;
        token.nombre   = user.nombre;
        token.apellido = user.apellido;
        token.rol      = user.rol;
        token.nivel    = user.nivel;
        token.permisos = user.permisos;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id       = token.id;
      session.user.username = token.username;
      session.user.nombre   = token.nombre;
      session.user.apellido = token.apellido;
      session.user.rol      = token.rol;
      session.user.nivel    = token.nivel;
      session.user.permisos = token.permisos;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

export { handler as GET, handler as POST };