// Destino: src/app/api/escalas/autorizadas/route.js
//
// GET /api/escalas/autorizadas

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conCascada } from "@/lib/api-helpers"

export const GET = conCascada("ESCALAS", async (request, context, session) => {
  const escalas = await prisma.escala.findMany({
    where: {
      deleted_at: null,
      autorizada: true,
    },
    orderBy: [{ updated_at: "desc" }],
    select: {
      id: true,
      nro_orden: true,
      fecha: true,
      hora_despegue_estimada: true,
      solicitante: true,
      estado: true,
      autorizada: true,
      autorizada_por: true,
      rol_autoriza: true,
      orden_autorizante: true,
      fecha_autorizacion: true,
      aeronave: { select: { matricula: true } },
      tipo_mision: { select: { codigo: true } },
    },
  })

  const idsUsuarios = [...new Set(escalas.map((e) => e.autorizada_por).filter(Boolean))]
  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: idsUsuarios } },
    select: { id: true, persona: { select: { grado: true, apellido: true } } },
  })
  const nombrePorUsuarioId = Object.fromEntries(
    usuarios.map((u) => [u.id, `${u.persona.grado} ${u.persona.apellido}`])
  )

  const resultado = escalas.map((e) => ({
    ...e,
    autorizada_por_nombre: e.autorizada_por ? nombrePorUsuarioId[e.autorizada_por] || "—" : null,
  }))

  return NextResponse.json(resultado)
})