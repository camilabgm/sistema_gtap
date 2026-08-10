// GET  /api/escalas/cargos-autorizacion  → los 5 cargos con su titular y adjunto actuales
// PUT  /api/escalas/cargos-autorizacion  → reasigna una posición puntual (titular o adjunto)
//
// Pantalla de administración: solo usuarios dentro de ROLES_ADMIN pueden
// ver y modificar esto — es lo que reparte el poder de autorizar escalas.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conAdmin } from "@/lib/api-helpers"
import {
  ROL_NOMBRE_POR_CARGO_AUTORIZACION,
  rolCoincideConCargo,
} from "@/lib/autorizacion"

// GET — lista los 5 cargos con su titular/adjunto actual (o null si no hay nadie)
export const GET = conAdmin("ESCALAS", async (request, context, session) => {
  const asignaciones = await prisma.cargoAutorizacion.findMany({
    where: {
      rol_autorizador: { in: Object.keys(ROL_NOMBRE_POR_CARGO_AUTORIZACION) },
      activo: true,
      deleted_at: null,
    },
    select: {
      rol_autorizador: true,
      orden: true,
      usuario: {
        select: {
          id: true,
          persona: { select: { nombre: true, apellido: true, grado: true } },
        },
      },
    },
  })

  const formatearPersona = (asignacion) =>
    asignacion
      ? {
          usuario_id: asignacion.usuario.id,
          nombre: `${asignacion.usuario.persona.grado} ${asignacion.usuario.persona.nombre} ${asignacion.usuario.persona.apellido}`,
        }
      : null

  const cargos = Object.entries(ROL_NOMBRE_POR_CARGO_AUTORIZACION).map(([rol, nombreRol]) => ({
    rol_autorizador: rol,
    nombre_rol: nombreRol,
    titular: formatearPersona(asignaciones.find((a) => a.rol_autorizador === rol && a.orden === 1)),
    adjunto: formatearPersona(asignaciones.find((a) => a.rol_autorizador === rol && a.orden === 2)),
  }))

  return NextResponse.json(cargos)
})

// PUT — reasigna titular o adjunto de un cargo puntual
// Body: { rol_autorizador: "JEFE_OPERACIONES", orden: 1, usuario_id: 8 }
export const PUT = conAdmin("ESCALAS", async (request, context, session) => {
  const body = await request.json()
  const rolAutorizador = body.rol_autorizador
  const orden = body.orden
  const usuarioIdNum = Number(body.usuario_id)

  // 1. rol_autorizador válido (uno de los 5 del mapeo)
  const nombreRolEsperado = ROL_NOMBRE_POR_CARGO_AUTORIZACION[rolAutorizador]
  if (!nombreRolEsperado) {
    return NextResponse.json({ error: "rol_autorizador inválido o no especificado" }, { status: 400 })
  }

  // 2. orden válido
  if (orden !== 1 && orden !== 2) {
    return NextResponse.json({ error: "orden debe ser 1 (titular) o 2 (adjunto)" }, { status: 400 })
  }

  // 3. usuario_id válido, existe y está activo
  if (!Number.isInteger(usuarioIdNum) || usuarioIdNum <= 0) {
    return NextResponse.json({ error: "usuario_id inválido" }, { status: 400 })
  }
  const usuario = await prisma.usuario.findFirst({
    where: { id: usuarioIdNum, activo: true },
    select: { id: true, rol: { select: { nombre: true } } },
  })
  if (!usuario) {
    return NextResponse.json({ error: "El usuario no existe o está inactivo" }, { status: 400 })
  }

  // 4. Prevención en el origen — SOLO para el TITULAR (orden 1): su Rol
  // actual tiene que corresponder al cargo pedido. El ADJUNTO (orden 2)
  // no tiene un Rol equivalente en el sistema — su Rol refleja su
  // función real (Piloto, Copiloto, etc.), no el cargo administrativo
  // que ocupa como respaldo de autorización, así que acá no se valida.
  if (orden === 1 && !rolCoincideConCargo(usuario.rol?.nombre ?? null, rolAutorizador)) {
    return NextResponse.json(
      { error: `Este usuario no tiene el Rol "${nombreRolEsperado}" — no puede ser asignado como titular de este cargo` },
      { status: 400 }
    )
  }

  // 5. No permitir que la misma persona sea titular y adjunto del mismo cargo a la vez
  const ordenOpuesto = orden === 1 ? 2 : 1
  const yaOcupaLaOtraPosicion = await prisma.cargoAutorizacion.findFirst({
    where: {
      rol_autorizador: rolAutorizador,
      orden: ordenOpuesto,
      usuario_id: usuarioIdNum,
      activo: true,
      deleted_at: null,
    },
  })
  if (yaOcupaLaOtraPosicion) {
    return NextResponse.json(
      { error: "Este usuario ya ocupa la otra posición (titular/adjunto) de este mismo cargo" },
      { status: 400 }
    )
  }

  // 6. Desactivar la asignación anterior de esta posición (si había) y crear la nueva —
  // mismo patrón de "un solo activo por vez, historial conservado" del resto del módulo
  const resultado = await prisma.$transaction(async (tx) => {
    await tx.cargoAutorizacion.updateMany({
      where: { rol_autorizador: rolAutorizador, orden, activo: true, deleted_at: null },
      data: { activo: false, editado_por: session.user.id },
    })

    return tx.cargoAutorizacion.create({
      data: {
        rol_autorizador: rolAutorizador,
        orden,
        usuario_id: usuarioIdNum,
        activo: true,
        creado_por: session.user.id,
      },
    })
  })

  return NextResponse.json(resultado, { status: 200 })
})