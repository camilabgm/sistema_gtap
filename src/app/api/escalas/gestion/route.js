// Destino: src/app/api/escalas/gestion/route.js
//
// GET /api/escalas/gestion?busqueda=&estado=&aeronave=&desde=&hasta=&pagina=
// GET /api/escalas/gestion?...&exportar=1
//
// NUEVO (rama feat/paginacion-servidor): el listado de Gestión de
// Escalas, paginado y filtrado en el servidor. Antes HistorialEscalas
// pedía GET /api/escalas sin parámetros — TODAS las escalas de la
// historia — y filtraba en el navegador. GET /api/escalas queda solo
// para la Agenda (con desde/hasta obligatorios).
//
// Filtros (todos opcionales; un valor inválido se ignora, no da error):
//   busqueda → solicitante, N.º de orden o código de misión, sin
//              distinguir mayúsculas
//   estado   → uno o varios estados de estadoDetallado(), separados por
//              coma (ej. PENDIENTE,VENCIDA_SIN_AUTORIZAR); se unen con
//              "o", como los checkboxes de la pantalla
//   aeronave → matrícula exacta
//   desde, hasta → fecha del vuelo (aaaa-mm-dd), inclusive. Una escala
//              SIN fecha (ej. un borrador recién creado) queda afuera
//              cuando hay filtro de fechas
//   pagina   → ver lib/paginacion.js
//
// Devuelve:
//   { escalas (las 20 de la página), total, pagina, totalPaginas,
//     contadores, aeronaves }
//   contadores: los 4 baldes de la barra de arriba + total, SIN
//     filtros (igual que antes). "Programada" es el total menos los
//     otros tres — mismo criterio que contarPorBalde().
//   aeronaves: matrículas con al menos una escala, para el select.
//
// Con exportar=1: { escalas } con TODAS las que cumplen los filtros,
// sin paginar ni contadores — es lo que usa el botón "Descargar PDF".

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { normalizarFechaSoloDia } from "@/lib/fechaSoloDia"
import { resolverNombresUsuarios } from "@/lib/auditoria"
import { condicionEstadoDetallado, CLAVES_ESTADO_DETALLADO } from "@/lib/escalas"
import { leerPagina, datosPaginacion } from "@/lib/paginacion"

// Mismos campos que pedía GET /api/escalas — los usan la tabla, las
// tarjetas, PanelDetalleEscala (incluido el panel de auditoría) y el PDF.
const SELECT_ESCALA = {
  id: true,
  nro_orden: true,
  fecha: true,
  hora_despegue_estimada: true,
  hora_arribo_estimada: true,
  solicitante: true,
  estado: true,
  es_borrador: true,
  autorizada: true,
  autorizada_por: true,
  fecha_autorizacion: true,
  rol_autoriza: true,
  creado_por: true,
  editado_por: true,
  created_at: true,
  motivo_abortada: true,
  observacion_aborto: true,
  updated_at: true,
  aeronave: { select: { matricula: true } },
  tipo_mision: { select: { codigo: true, nombre: true } },
  itinerarios: {
    where: { deleted_at: null },
    orderBy: { orden: "asc" },
    select: { orden: true, origen: true, destino: true },
  },
  tripulacion: {
    where: { deleted_at: null },
    select: {
      rol_en_vuelo: true,
      persona: { select: { grado: true, apellido: true } },
    },
  },
}

// Mismo orden que veía la pantalla (antes lo hacía el navegador), con
// desempate por id para que las páginas sean estables.
const ORDEN = [{ updated_at: "desc" }, { id: "desc" }]

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/

// "2026-10-01" → fecha a medianoche UTC (como se guardan los campos
// @db.Date). Cualquier otra cosa → null (el filtro se ignora).
function leerFecha(valor) {
  if (!valor || !FORMATO_FECHA.test(valor)) return null
  const fecha = normalizarFechaSoloDia(valor)
  return fecha && !isNaN(fecha.getTime()) ? fecha : null
}

// Agrega creado_por_nombre, editado_por_nombre y autorizada_por_nombre
// resolviendo todos los ids en UNA sola consulta por lote.
async function conNombres(escalas) {
  const ids = escalas.flatMap((e) => [e.creado_por, e.editado_por, e.autorizada_por])
  const nombres = await resolverNombresUsuarios(ids)
  return escalas.map((e) => ({
    ...e,
    creado_por_nombre:     e.creado_por     ? nombres[e.creado_por]     ?? null : null,
    editado_por_nombre:    e.editado_por    ? nombres[e.editado_por]    ?? null : null,
    autorizada_por_nombre: e.autorizada_por ? nombres[e.autorizada_por] ?? null : null,
  }))
}

export const GET = conPermiso("ESCALAS", "puede_ver", async (request) => {
  const { searchParams } = new URL(request.url)

  // Un solo "ahora" para todo el pedido: la lista, el total y los
  // contadores miran el mismo instante (ver condicionEstadoDetallado).
  const ahora = new Date()

  // Cada filtro activo suma una condición; al final van todas juntas
  // con AND (así los OR internos de cada una no se pisan entre sí).
  const condiciones = []

  const busqueda = (searchParams.get("busqueda") || "").trim()
  if (busqueda) {
    const contiene = { contains: busqueda, mode: "insensitive" }
    condiciones.push({
      OR: [
        { solicitante: contiene },
        { nro_orden: contiene },
        { tipo_mision: { is: { codigo: contiene } } },
      ],
    })
  }

  const estados = [
    ...new Set(
      (searchParams.get("estado") || "")
        .split(",")
        .map((c) => c.trim())
        .filter((c) => CLAVES_ESTADO_DETALLADO.includes(c))
    ),
  ]
  if (estados.length > 0) {
    condiciones.push({ OR: estados.map((c) => condicionEstadoDetallado(c, ahora)) })
  }

  const aeronave = (searchParams.get("aeronave") || "").trim()
  if (aeronave) {
    condiciones.push({ aeronave: { is: { matricula: aeronave } } })
  }

  const desde = leerFecha(searchParams.get("desde"))
  const hasta = leerFecha(searchParams.get("hasta"))
  if (desde) condiciones.push({ fecha: { gte: desde } })
  if (hasta) condiciones.push({ fecha: { lte: hasta } })

  const where = {
    deleted_at: null,
    ...(condiciones.length > 0 ? { AND: condiciones } : {}),
  }

  // ── Exportar: todas las filtradas, sin paginar ─────────────────────
  if (searchParams.get("exportar") === "1") {
    const escalas = await prisma.escala.findMany({ where, orderBy: ORDEN, select: SELECT_ESCALA })
    return NextResponse.json({ escalas: await conNombres(escalas) })
  }

  // ── Listado paginado + contadores + aeronaves ──────────────────────
  // Todo lo que no depende entre sí va en paralelo.
  const sinBorrar = { deleted_at: null }
  const contarEstado = (clave) =>
    prisma.escala.count({ where: { ...sinBorrar, AND: [condicionEstadoDetallado(clave, ahora)] } })

  const [total, totalSistema, enVuelo, cumplidas, abortadas, aeronavesConEscalas] = await Promise.all([
    prisma.escala.count({ where }),
    prisma.escala.count({ where: sinBorrar }),
    contarEstado("EN_DESARROLLO"),
    contarEstado("CUMPLIDA"),
    contarEstado("ABORTADA"),
    prisma.aeronave.findMany({
      where: { escalas: { some: { deleted_at: null } } },
      select: { matricula: true },
      orderBy: { matricula: "asc" },
    }),
  ])

  const { pagina, totalPaginas, skip, take } = datosPaginacion(leerPagina(searchParams.get("pagina")), total)

  const escalas = await prisma.escala.findMany({
    where,
    orderBy: ORDEN,
    skip,
    take,
    select: SELECT_ESCALA,
  })

  return NextResponse.json({
    escalas: await conNombres(escalas),
    total,
    pagina,
    totalPaginas,
    contadores: {
      PROGRAMADA: totalSistema - enVuelo - cumplidas - abortadas,
      EN_DESARROLLO: enVuelo,
      CUMPLIDA: cumplidas,
      ABORTADA: abortadas,
      total: totalSistema,
    },
    aeronaves: aeronavesConEscalas.map((a) => a.matricula),
  })
})