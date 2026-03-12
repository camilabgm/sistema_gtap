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
        // Busca el usuario en la base de datos
        const usuario = await prisma.usuario.findUnique({
          where: { username: credentials.username },
          include: {
            persona: true,
            rol: true,
            nivel: true,
          },
        });

        // Si no existe el usuario, retorna null
        if (!usuario) return null;

        // Si el usuario está inactivo, retorna null
        if (!usuario.activo) return null;

        // Verifica la contraseña
        const passwordValido = await bcrypt.compare(
          credentials.password,
          usuario.password
        );

        if (!passwordValido) return null;

        // Retorna los datos del usuario para la sesión
        return {
          id: usuario.id,
          username: usuario.username,
          nombre: usuario.persona.nombre,
          apellido: usuario.persona.apellido,
          rol: usuario.rol.nombre,
          nivel: usuario.nivel.nivel,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.nombre = user.nombre;
        token.apellido = user.apellido;
        token.rol = user.rol;
        token.nivel = user.nivel;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.username = token.username;
      session.user.nombre = token.nombre;
      session.user.apellido = token.apellido;
      session.user.rol = token.rol;
      session.user.nivel = token.nivel;
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