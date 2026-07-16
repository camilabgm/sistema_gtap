import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { validarContrasena } from "@/lib/validarContrasena"


export async function PUT(request) {
  const sesion = await getServerSession(authOptions)

  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

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
    where: { id: sesion.user.id },
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
    where: { id: sesion.user.id },
    data:  {
      password:          passwordHash,
      password_temporal: false,
      editado_por:       sesion.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}