import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validarContrasena } from "@/lib/validarContrasena"
import { conSesion } from "@/lib/api-helpers"

export const PUT = conSesion("CAMBIAR_PASSWORD", async (request, context, session) => {
  const { password_actual, password_nuevo } = await request.json()

  if (!password_actual || !password_nuevo) {
    return NextResponse.json({ error: "Completá todos los campos" }, { status: 400 })
  }

  // Validar reglas de contraseña (misma función que usa el frontend)
  const { valida, errores } = validarContrasena(password_nuevo)
  if (!valida) {
    return NextResponse.json(
      { error: errores.join(". ") + "." },
      { status: 400 }
    )
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
  })

  const passwordValida = await bcrypt.compare(password_actual, usuario.password)

  if (!passwordValida) {
    return NextResponse.json(
      { error: "La contraseña actual es incorrecta" },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(password_nuevo, 10)

  await prisma.usuario.update({
    where: { id: session.user.id },
    data:  {
      password:          passwordHash,
      password_temporal: false,
      editado_por:       session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
})