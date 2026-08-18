// GET /api/manifiesto/<escalaId> → detalle completo para el panel
// derecho: aeronave, ruta, horas (estimadas o reales según estado),
// combustible, tripulación, pasajeros, cargas, ocupación y estado del
// candado de manifiesto (cerrado o no).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { obtenerHorasEfectivas, formatearMinutos, calcularOcupacion } from "@/lib/manifiesto"

export const GET = conPermiso("MANIFIESTO", "puede_ver", async (request, context, session) => {
  const { escalaId } = await context.params
  const id = parseInt(escalaId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      fecha: true,
      estado: true,
      solicitante: true,
      nro_orden: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      manifiesto_cerrado: true,
      manifiesto_cerrado_en: true,
      aeronave: {
        select: { id: true, matricula: true, tipo: true, capacidad_pasajeros: true, tipo_combustible: true },
      },
      tipo_mision: { select: { codigo: true, nombre: true } },
      itinerarios: {
        where: { deleted_at: null },
        orderBy: { orden: "asc" },
        select: {
          orden: true,
          origen: true,
          destino: true,
          hora_estimada_salida: true,
          hora_estimada_llegada: true,
          hora_real_salida: true,
          hora_real_llegada: true,
        },
      },
      tripulacion: {
        where: { deleted_at: null },
        select: {
          persona_id: true,
          rol_en_vuelo: true,
          persona: { select: { nombre: true, apellido: true, grado: true } },
        },
      },
      // Se devuelve al frontend porque usuarioPuedeGestionarManifiesto()
      // se llama también del lado del cliente (ManifiestoScreen.js), y
      // necesita esta lista para calcular puedeGestionar ahí.
      acuses: {
        where: { deleted_at: null, rol: "SUPERVISOR_SEMANA" },
        select: { persona_id: true },
      },
      pasajeros: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
        select: { id: true, nro_documento: true, nombre: true, apellido: true, nacionalidad: true },
      },
      cargas: {
        where: { deleted_at: null },
        orderBy: { created_at: "asc" },
        select: { id: true, tipo: true, descripcion: true, peso: true },
      },
      post_vuelos: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 1,
        select: { horas_vuelo_minutos: true, horas_tierra_minutos: true, combustible_consumido: true },
      },
    },
  })

  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  const horas = obtenerHorasEfectivas(escala)
  const postVuelo = escala.post_vuelos[0] ?? null
  const capacidad = escala.aeronave?.capacidad_pasajeros ?? null

  return NextResponse.json({
    id: escala.id,
    fecha: escala.fecha,
    estado: escala.estado,
    solicitante: escala.solicitante,
    nro_orden: escala.nro_orden,
    origen: escala.itinerarios[0]?.origen ?? null,
    destino: escala.itinerarios[escala.itinerarios.length - 1]?.destino ?? null,
    hora_salida: horas.salida,
    hora_llegada: horas.llegada,
    hora_es_real: horas.esReal,
    aeronave: escala.aeronave,
    tipo_mision: escala.tipo_mision,
    tripulacion: escala.tripulacion,
    acuses: escala.acuses,
    manifiesto_cerrado: escala.manifiesto_cerrado,
    manifiesto_cerrado_en: escala.manifiesto_cerrado_en,
    pasajeros: escala.pasajeros,
    cargas: escala.cargas,
    capacidad,
    ocupacion_porcentaje: calcularOcupacion(escala.pasajeros.length, capacidad),
    horas_vuelo: postVuelo ? formatearMinutos(postVuelo.horas_vuelo_minutos) : null,
    horas_tierra: postVuelo ? formatearMinutos(postVuelo.horas_tierra_minutos) : null,
    combustible_consumido: postVuelo?.combustible_consumido ?? null,
    tipo_combustible: escala.aeronave?.tipo_combustible ?? null,
  })
})