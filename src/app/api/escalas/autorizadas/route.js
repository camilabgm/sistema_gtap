// Destino: src/app/api/escalas/autorizadas/route.js
//
// GET /api/escalas/autorizadas
//
// Lista las escalas ya resueltas (autorizadas o rechazadas), con quién
// lo hizo y cuándo. autorizada_por y rechazada_por guardan el id de
// Usuario (no de Persona) — se resuelven acá a nombre legible con una
// sola consulta agrupada, en vez de una por escala.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.esCargoDeCascada) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const escalas = await prisma.escala.findMany({
      where: {
        deleted_at: null,
        OR: [{ autorizada: true }, { estado: "RECHAZADA" }],
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
        fecha_autorizacion: true,
        rechazada_por: true,
        motivo_rechazo: true,
        fecha_rechazo: true,
        aeronave: { select: { matricula: true } },
        tipo_mision: { select: { codigo: true } },
      },
    })

    const idsUsuarios = [
      ...new Set(escalas.flatMap((e) => [e.autorizada_por, e.rechazada_por]).filter(Boolean)),
    ]
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
      rechazada_por_nombre: e.rechazada_por ? nombrePorUsuarioId[e.rechazada_por] || "—" : null,
    }))

    return NextResponse.json(resultado)
  } catch (error) {
    console.error("Error GET escalas autorizadas:", error)
    return NextResponse.json({ error: "Error al obtener escalas autorizadas" }, { status: 500 })
  }
}