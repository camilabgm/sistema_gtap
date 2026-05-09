import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function PUT(request) {
  const sesion = await getServerSession(authOptions)

  if (!sesion || sesion.user.rol !== "Comandante") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { nuevo_comandante_id, rol_saliente_id } = await request.json()

  if (!nuevo_comandante_id || !rol_saliente_id) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
  }

  // Verificamos que el nuevo Comandante exista y tenga usuario activo
  const nuevoComandante = await prisma.usuario.findUnique({
    where: { id: nuevo_comandante_id },
  })

  if (!nuevoComandante || !nuevoComandante.activo) {
    return NextResponse.json(
      { error: "El usuario seleccionado no existe o está inactivo" },
      { status: 404 }
    )
  }

  // Obtenemos el rol Comandante
  const rolComandante = await prisma.rol.findUnique({
    where: { nombre: "Comandante" },
  })

  if (!rolComandante) {
    return NextResponse.json({ error: "Rol Comandante no encontrado" }, { status: 500 })
  }

  // Transacción atómica — ambos cambios ocurren juntos o ninguno
  await prisma.$transaction([
    // Nuevo Comandante recibe el rol
    prisma.usuario.update({
      where: { id: nuevo_comandante_id },
      data:  {
        rol_id:              rolComandante.id,
        sesion_invalidada_en: new Date(),
        editado_por:         sesion.user.id,
      },
    }),
    // Comandante saliente recibe el rol asignado
    prisma.usuario.update({
      where: { id: sesion.user.id },
      data:  {
        rol_id:              rol_saliente_id,
        sesion_invalidada_en: new Date(),
        editado_por:         sesion.user.id,
      },
    }),
  ])

  return NextResponse.json({ ok: true })
}