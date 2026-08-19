// Destino: src/app/api/autorizadores/asumir/route.js
//
// PUT /api/autorizadores/asumir
//
// Para cuando el autorizante activo está bloqueado en la práctica (ej.
// sin acceso al sistema) pero el sistema todavía lo marca disponible —
// alguien más abajo en la cascada puede "asumir" su lugar en vez de
// esperar a que él mismo derive. Reusa el mismo mecanismo de
// AutorizadorNoDisponible que ya existe para la derivación manual, solo
// que la crea OTRA persona a nombre del bloqueado, no el propio
// bloqueado.
//
// Flujo:
//   1. Calcula quién es el autorizante activo real ahora mismo.
//   2. Si ya sos vos, o si no hay nadie bloqueando (cascada vacía),
//      no hay nada que asumir — error.
//   3. Crea la derivación para la persona bloqueada.
//   4. Recalcula el autorizante activo real. Si ahora coincide con
//      quien ejecutó la acción, listo. Si no (alguien con más
//      prioridad todavía sirve), deshace la derivación creada y avisa
//      — así nunca queda un registro huérfano de alguien "asumiendo"
//      algo que en realidad no le correspondía.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conCascada } from "@/lib/api-helpers"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export const PUT = conCascada("ESCALAS", async (request, context, session) => {
  const { autorizantePersonaId: bloqueadoId } = await calcularAutorizanteActivo()

  if (!bloqueadoId) {
    return NextResponse.json(
      { error: "No hay ningún autorizante activo en este momento — no hay nada que asumir" },
      { status: 409 }
    )
  }
  if (bloqueadoId === session.user.personaId) {
    return NextResponse.json(
      { error: "Ya sos vos el autorizante activo — no hace falta asumir nada" },
      { status: 409 }
    )
  }

  // Defensivo: si el bloqueado ya tiene una derivación activa, en
  // teoría no debería figurar como autorizante activo — pero por las
  // dudas no se duplica.
  const yaTieneDerivacion = await prisma.autorizadorNoDisponible.findFirst({
    where: { persona_id: bloqueadoId, deleted_at: null, hasta: null },
  })
  if (yaTieneDerivacion) {
    return NextResponse.json(
      { error: "Esa persona ya tiene una derivación activa" },
      { status: 409 }
    )
  }

  const [actor, bloqueado] = await Promise.all([
    prisma.persona.findFirst({ where: { id: session.user.personaId }, select: { grado: true, apellido: true } }),
    prisma.persona.findFirst({ where: { id: bloqueadoId }, select: { grado: true, apellido: true } }),
  ])

  const derivacion = await prisma.autorizadorNoDisponible.create({
    data: {
      persona_id: bloqueadoId,
      desde: new Date(),
      hasta: null,
      motivo: "OTRO",
      motivo_detalle: `Asumida por ${actor?.grado ?? ""} ${actor?.apellido ?? "—"} — ${bloqueado?.grado ?? ""} ${bloqueado?.apellido ?? "—"} no pudo actuar.`.trim(),
      creado_por: session.user.id,
    },
  })

  const { autorizantePersonaId: nuevoAutorizante } = await calcularAutorizanteActivo()

  if (nuevoAutorizante !== session.user.personaId) {
    // No era el siguiente legítimo — se deshace, no queda registro huérfano.
    await prisma.autorizadorNoDisponible.delete({ where: { id: derivacion.id } })
    return NextResponse.json(
      { error: "No sos el siguiente disponible en la cascada — alguien más tiene prioridad ahora" },
      { status: 409 }
    )
  }

  return NextResponse.json({ ok: true }, { status: 201 })
})