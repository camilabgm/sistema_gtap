import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function PUT(request) {
  const sesion = await getServerSession(authOptions)

  if (!sesion) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { password_actual, password_nuevo } = await request.json()

  if (!password_actual || !password_nuevo) {
    return NextResponse.json({ error: "Completá todos los campos" }, { status: 400 })
  }

  if (password_nuevo.length < 6) {
    return NextResponse.json(
      { error: "La contraseña nueva debe tener al menos 6 caracteres" },
      { status: 400 }
    )
  }

  // Verificamos que la contraseña actual sea correcta
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
      password:    passwordHash,
      editado_por: sesion.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}