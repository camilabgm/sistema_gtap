// Destino: src/app/api/escalas/pendientes-autorizar/route.js
//
// GET /api/escalas/pendientes-autorizar
//
// Lista todas las escalas publicadas, sin autorizar, sin rechazar y sin
// abortar. Calcula UNA sola vez quién es el autorizante activo ahora
// mismo (reusando calcularAutorizanteActivo) — porque, al ser un solo
// autorizante a la vez, esa respuesta aplica igual a todas las escalas
// de la lista. El frontend usa "podesActuar" para mostrar u ocultar los
// botones de acción en toda la lista, sin distinguir fila por fila.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { esCargoDeCascada } from "@/lib/autorizacion"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!esCargoDeCascada(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

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
  } catch (error) {
    console.error("Error GET pendientes-autorizar:", error)
    return NextResponse.json({ error: "Error al obtener escalas pendientes" }, { status: 500 })
  }
}