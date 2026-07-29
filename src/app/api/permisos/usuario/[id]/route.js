import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conAdmin } from "@/lib/api-helpers"

// GET — trae permisos del rol + overrides individuales del usuario
export const GET = conAdmin("PERMISOS_USUARIO", async (request, { params }, session) => {
  const { id } = await params

  const usuario = await prisma.usuario.findUnique({
    where:   { id: parseInt(id) },
    include: {
      rol:              { include: { permisos_rol: true } },
      permisos_usuario: true,
    },
  })

  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
  }

  return NextResponse.json({
    usuario_id:       usuario.id,
    rol_nombre:       usuario.rol.nombre,
    permisos_rol:     usuario.rol.permisos_rol,
    permisos_usuario: usuario.permisos_usuario,
  })
})

// PUT — guarda overrides individuales e invalida sesión del usuario
export const PUT = conAdmin("PERMISOS_USUARIO", async (request, { params }, session) => {
  const { id } = await params
  const usuarioId = parseInt(id)
  const { permisos } = await request.json()
  // permisos = [{ modulo, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_reportes, es_override }]
  // Si es_override = false → eliminamos el registro individual (vuelve al default del rol)

  for (const permiso of permisos) {
    if (!permiso.es_override) {
      // Sin override → borramos el registro individual si existe
      await prisma.permisoUsuario.deleteMany({
        where: { usuario_id: usuarioId, modulo: permiso.modulo },
      })
    } else {
      // Con override → upsert
      await prisma.permisoUsuario.upsert({
        where: {
          usuario_id_modulo: {
            usuario_id: usuarioId,
            modulo:     permiso.modulo,
          },
        },
        update: {
          puede_ver:      permiso.puede_ver,
          puede_crear:    permiso.puede_crear,
          puede_editar:   permiso.puede_editar,
          puede_eliminar: permiso.puede_eliminar,
          puede_reportes: permiso.puede_reportes,
          editado_por:    session.user.id,
        },
        create: {
          usuario_id:     usuarioId,
          modulo:         permiso.modulo,
          puede_ver:      permiso.puede_ver,
          puede_crear:    permiso.puede_crear,
          puede_editar:   permiso.puede_editar,
          puede_eliminar: permiso.puede_eliminar,
          puede_reportes: permiso.puede_reportes,
          creado_por:     session.user.id,
        },
      })
    }
  }

  // Invalidamos solo la sesión de este usuario
  await prisma.usuario.update({
    where: { id: usuarioId },
    data:  { sesion_invalidada_en: new Date() },
  })

  return NextResponse.json({ ok: true })
})