import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import bcrypt from "bcryptjs"

async function obtenerIdRolComandante() {
  const rol = await prisma.rol.findUnique({
    where:  { nombre: "Comandante" },
    select: { id: true },
  })
  return rol?.id ?? -1
}

export const PUT = conPermiso("PERSONAS", "puede_editar", async (request, { params }, session) => {
  const { id } = await params
  const body   = await request.json()

  const idRolComandante = await obtenerIdRolComandante()

  const data = {
    rol_id:      Number(body.rol_id),
    editado_por: session.user.id,
  }

  if (body.password && body.password.trim() !== "") {
    data.password = await bcrypt.hash(body.password, 10)
  }

  if (Number(body.rol_id) === idRolComandante) {
    const otroComandante = await prisma.usuario.findFirst({
      where: {
        rol:        { nombre: "Comandante" },
        activo:     true,
        deleted_at: null,
        id:         { not: Number(id) },
      },
    })

    if (otroComandante) {
      return NextResponse.json(
        { error: "Ya existe un Comandante activo en el sistema. Cambiá su rol primero antes de asignar uno nuevo." },
        { status: 409 }
      )
    }
  }

  const usuarioActual = await prisma.usuario.findUnique({
    where:  { id: Number(id) },
    select: { rol_id: true, rol_secundario_id: true, rol_secundario_combina: true },
  })

  // Rol secundario — body.rol_secundario_id puede venir:
  //  - undefined: el formulario no tocó este campo (no debería pasar
  //    desde UsuarioModal, que siempre lo manda, pero por las dudas)
  //  - null: se está sacando el rol secundario que tenía
  //  - un número: se está asignando o cambiando
  // Nunca puede ser Comandante — no tiene sentido un "Comandante
  // secundario". El frontend ya lo filtra del dropdown, esto es el
  // candado real.
  const rolSecundarioNuevo =
    body.rol_secundario_id === undefined
      ? undefined
      : body.rol_secundario_id === null
        ? null
        : Number(body.rol_secundario_id)

  if (rolSecundarioNuevo === idRolComandante) {
    return NextResponse.json({ error: "El rol secundario no puede ser Comandante" }, { status: 400 })
  }

  if (rolSecundarioNuevo !== undefined) {
    const cambioRol     = rolSecundarioNuevo !== usuarioActual?.rol_secundario_id
    const cambioCombina =
      rolSecundarioNuevo !== null &&
      !!body.rol_secundario_combina !== !!usuarioActual?.rol_secundario_combina

    if (cambioRol || cambioCombina) {
      data.rol_secundario_id = rolSecundarioNuevo
      // Al sacarlo (null), combina vuelve al default true — no queda
      // dando vueltas un valor de una asignación que ya no existe.
      data.rol_secundario_combina      = rolSecundarioNuevo === null ? true : !!body.rol_secundario_combina
      data.rol_secundario_asignado_por = rolSecundarioNuevo === null ? null : session.user.id
      data.rol_secundario_desde        = rolSecundarioNuevo === null ? null : new Date()
    }
  }

  // Invalida sesión si cambió el rol PRINCIPAL o el SECUNDARIO — los
  // dos afectan session.user.permisos y session.user.esSupervisorSemana,
  // así que en cualquiera de los dos casos hace falta que vuelva a
  // loguearse para que tome los permisos nuevos.
  if (
    usuarioActual?.rol_id !== Number(body.rol_id) ||
    data.rol_secundario_id !== undefined
  ) {
    data.sesion_invalidada_en = new Date()
  }

  const usuario = await prisma.usuario.update({
    where: { id: Number(id) },
    data,
    select: {
      id:         true,
      username:   true,
      persona_id: true,
      rol_id:     true,
      rol_secundario_id:      true,
      rol_secundario_combina: true,
      activo:     true,
      updated_at: true,
    },
  })

  return NextResponse.json(usuario)
})

export const DELETE = conPermiso("PERSONAS", "puede_editar", async (request, { params }, session) => {
  const { id } = await params

  await prisma.usuario.update({
    where: { id: Number(id) },
    data: {
      activo:        false,
      deleted_at:    new Date(),
      eliminado_por: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
})