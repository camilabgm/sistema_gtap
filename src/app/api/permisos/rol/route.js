import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { esAdministrador } from "@/lib/autorizacion"

// GET — trae todos los roles con sus permisos actuales
export async function GET() {
  const sesion = await getServerSession(authOptions)

  // Solo un administrador (Comandante o Jefe de Operaciones)
  if (!esAdministrador(sesion)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const roles = await prisma.rol.findMany({
    where:   { deleted_at: null },
    include: { permisos_rol: true },
    orderBy: { id: "asc" },
  })

  return NextResponse.json(roles)
}

// PUT — actualiza permisos de un rol e invalida sesiones afectadas
export async function PUT(request) {
  const sesion = await getServerSession(authOptions)

  // Solo un administrador (Comandante o Jefe de Operaciones)
  if (!esAdministrador(sesion)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { rol_id, permisos } = await request.json()
  // permisos = [{ modulo, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_reportes }]

  if (!rol_id || !permisos || !Array.isArray(permisos)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
  }

  // Actualizamos cada permiso del rol
  for (const permiso of permisos) {
    await prisma.permisoRol.upsert({
      where: {
        rol_id_modulo: {
          rol_id: rol_id,
          modulo:  permiso.modulo,
        },
      },
      update: {
        puede_ver:      permiso.puede_ver,
        puede_crear:    permiso.puede_crear,
        puede_editar:   permiso.puede_editar,
        puede_eliminar: permiso.puede_eliminar,
        puede_reportes: permiso.puede_reportes,
        editado_por:    sesion.user.id,
      },
      create: {
        rol_id:         rol_id,
        modulo:         permiso.modulo,
        puede_ver:      permiso.puede_ver,
        puede_crear:    permiso.puede_crear,
        puede_editar:   permiso.puede_editar,
        puede_eliminar: permiso.puede_eliminar,
        puede_reportes: permiso.puede_reportes,
        creado_por:     sesion.user.id,
      },
    })
  }

  // Invalidamos sesiones de todos los usuarios de ese rol
  await prisma.usuario.updateMany({
    where: { rol_id: rol_id },
    data:  { sesion_invalidada_en: new Date() },
  })

  return NextResponse.json({ ok: true })
}