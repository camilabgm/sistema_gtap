// src/app/api/auth/[...nextauth]/route.js
//
// Puerta de entrada de NextAuth — el endpoint que Next.js expone para
// /api/auth/signin, /api/auth/session, /api/auth/signout, etc.
//
// Toda la lógica real (buscar usuario, comparar contraseña, armar
// permisos, callbacks de sesión) vive en un solo lugar: src/auth.js.
// Este archivo solo la importa y la usa — así hay una única fuente de
// verdad para todo el sistema de login, sin copias que puedan
// desincronizarse entre sí.

import NextAuth from "next-auth"
import { authOptions } from "@/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }