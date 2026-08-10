// Destino: src/app/api/escalas/pendientes-autorizar/route.js
//
// GET /api/escalas/pendientes-autorizar

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conCascada } from "@/lib/api-helpers"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export const GET = conCascada("ESCALAS", async (request, context, session) => {
  const { autorizanteRol, autorizantePersonaId } = await calcularAutorizanteActivo()

  let autorizanteActivo = null
  if (autorizantePersonaId) {
    const persona = await prisma.persona.findFirst({
      where: { id: autorizantePersonaId },
      select: { nombre: true, apellido: true, grado: true },
    })
    autorizanteActivo = {
      rol_autorizador: autorizanteRol,
      persona_id: autorizantePersonaId,
      nombre: persona ? `${persona.grado} ${persona.apellido}` : "—",
    }
  }

  const podesActuar = !!autorizantePersonaId && autorizantePersonaId === session.user.personaId

  const escalas = await prisma.escala.findMany({
    where: {
      es_borrador: false,
      autorizada: false,
      estado: { notIn: ["ABORTADA", "RECHAZADA"] },
      deleted_at: null,
    },
    orderBy: [{ fecha: "asc" }, { hora_despegue_estimada: "asc" }],
    select: {
      id: true,
      nro_orden: true,
      fecha: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      solicitante: true,
      aeronave: { select: { matricula: true } },
      tipo_mision: { select: { codigo: true, nombre: true } },
      tripulacion: {
        where: { deleted_at: null },
        select: {
          rol_en_vuelo: true,
          persona: { select: { grado: true, apellido: true } },
        },
      },
      solicitudes: {
        orderBy: { fecha_recepcion: "asc" },
        take: 1,
        select: { fecha_recepcion: true },
      },
    },
  })

  return NextResponse.json({ autorizanteActivo, podesActuar, escalas })
})