// Destino: src/app/api/escalas/autorizadas/route.js
//
// GET /api/escalas/autorizadas?pagina=N
//
// CAMBIO (rama feat/paginacion-servidor):
//   - Paginado: devuelve { escalas, total, pagina, totalPaginas } en vez
//     de la lista completa. Antes traía TODAS las escalas autorizadas de
//     la historia, y esa lista crece con cada autorización. El único que
//     usa este endpoint es PendientesAutorizar (pestaña Autorizadas).
//   - Orden por fecha_autorizacion (antes updated_at). updated_at cambia
//     cada vez que se toca la escala: una autorizada hace un mes que
//     después se marca cumplida saltaba a la página 1, y mientras
//     alguien miraba la página 2 una escala podía repetirse o no
//     aparecer nunca. fecha_autorizacion no cambia después de
//     autorizar. Desempate por id: dos autorizaciones en el mismo
//     segundo salen siempre en el mismo orden.
//   - Si alguna escala autorizada no tuviera fecha_autorizacion (datos
//     viejos o cargados a mano), queda al final, no arriba de todo
//     (PostgreSQL pone los vacíos primero en un orden descendente).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conCascada } from "@/lib/api-helpers"
import { leerPagina, datosPaginacion } from "@/lib/paginacion"

export const GET = conCascada("ESCALAS", async (request, context, session) => {
  const { searchParams } = new URL(request.url)

  const where = {
    deleted_at: null,
    autorizada: true,
  }

  // Primero el total (para saber cuántas páginas hay y si la pedida
  // existe), después solo las escalas de esa página.
  const total = await prisma.escala.count({ where })
  const { pagina, totalPaginas, skip, take } = datosPaginacion(leerPagina(searchParams.get("pagina")), total)

  const escalas = await prisma.escala.findMany({
    where,
    orderBy: [
      { fecha_autorizacion: { sort: "desc", nulls: "last" } },
      { id: "desc" },
    ],
    skip,
    take,
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

  return NextResponse.json({ escalas: resultado, total, pagina, totalPaginas })
})