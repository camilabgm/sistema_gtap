// GET /api/manifiesto/<escalaId> → detalle completo para el panel
// derecho: aeronave, ruta, horas (estimadas o reales según estado),
// combustible, tripulación, pasajeros, cargas, ocupación y estado del
// candado de manifiesto (cerrado o no).
//
// tripulacion se sigue trayendo — se usa para MOSTRAR en pantalla
// quién vuela, no para decidir permisos (eso ya no depende de la
// escala, ver usuarioPuedeGestionarManifiesto en manifiesto.js).
// acuses se saca del select: ya no hace falta para nada acá.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { obtenerHorasEfectivas, formatearMinutos, calcularOcupacion } from "@/lib/manifiesto"
import { resolverNombresUsuarios } from "@/lib/auditoria"

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
      es_borrador: true,
      autorizada: true,
      solicitante: true,
      nro_orden: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      manifiesto_cerrado: true,
      manifiesto_cerrado_en: true,
      manifiesto_cerrado_por: true,
      manifiesto_creado_por: true,
      manifiesto_creado_en: true,
      manifiesto_sin_pasajeros: true,
      manifiesto_sin_carga: true,
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

  const nombres = await resolverNombresUsuarios([escala.manifiesto_creado_por, escala.manifiesto_cerrado_por])

  return NextResponse.json({
    id: escala.id,
    fecha: escala.fecha,
    estado: escala.estado,
    es_borrador: escala.es_borrador,
    autorizada: escala.autorizada,
    solicitante: escala.solicitante,
    nro_orden: escala.nro_orden,
    origen: escala.itinerarios[0]?.origen ?? null,
    destino: escala.itinerarios[escala.itinerarios.length - 1]?.destino ?? null,
    hora_salida: horas.salida,
    hora_llegada: horas.llegada,
    hora_es_real: horas.esReal,
    // Crudo, sin procesar — lo necesita usuarioPuedeGestionarManifiesto()
    // del lado del cliente (ManifiestoScreen.js) para calcular si el
    // manifiesto ya se cerró por hora pasada. hora_salida/hora_llegada
    // de arriba ya vienen procesados (estimada o real según estado) y
    // no sirven para ese cálculo puntual.
    hora_despegue_estimada: escala.hora_despegue_estimada,
    hora_arribo_estimada: escala.hora_arribo_estimada,
    aeronave: escala.aeronave,
    tipo_mision: escala.tipo_mision,
    tripulacion: escala.tripulacion,
    manifiesto_cerrado: escala.manifiesto_cerrado,
    manifiesto_cerrado_en: escala.manifiesto_cerrado_en,
    manifiesto_cerrado_por_nombre: nombres[escala.manifiesto_cerrado_por] ?? null,
    manifiesto_creado_en: escala.manifiesto_creado_en,
    manifiesto_creado_por_nombre: nombres[escala.manifiesto_creado_por] ?? null,
    manifiesto_sin_pasajeros: escala.manifiesto_sin_pasajeros,
    manifiesto_sin_carga: escala.manifiesto_sin_carga,
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

// DELETE — borra el Manifiesto COMPLETO de esta escala: todos los
// pasajeros, todas las cargas, y resetea los campos de auditoría
// (manifiesto_creado_por/en, manifiesto_cerrado*) — deja la escala como
// si el manifiesto nunca se hubiera tocado. Restringido a quien tenga
// MANIFIESTO.puede_eliminar en la matriz — hoy, solo Comandante. No
// chequea si está cerrado: es justo la herramienta para corregir un
// error después de cerrado, así que tiene que funcionar en cualquier
// estado.
export const DELETE = conPermiso("MANIFIESTO", "puede_eliminar", async (request, context, session) => {
  const { escalaId } = await context.params
  const id = parseInt(escalaId, 10)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await prisma.escala.findFirst({
    where: { id, deleted_at: null },
    select: { id: true },
  })
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.escalaPasajero.updateMany({
      where: { escala_id: id, deleted_at: null },
      data: { deleted_at: new Date(), eliminado_por: session.user.id },
    })
    await tx.escalaCarga.updateMany({
      where: { escala_id: id, deleted_at: null },
      data: { deleted_at: new Date(), eliminado_por: session.user.id },
    })
    await tx.escala.update({
      where: { id },
      data: {
        manifiesto_creado_por: null,
        manifiesto_creado_en: null,
        manifiesto_cerrado: false,
        manifiesto_cerrado_por: null,
        manifiesto_cerrado_en: null,
        manifiesto_sin_pasajeros: false,
        manifiesto_sin_carga: false,
        editado_por: session.user.id,
      },
    })
  })

  return NextResponse.json({ ok: true })
})