// Destino: src/app/api/escalas/[id]/post-vuelo/route.js

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion, conPermiso } from "@/lib/api-helpers"
import {
  puedeCargarPostVuelo,
  esTripulanteDeEscala,
  calcularDefaultsPostVuelo,
  calcularHorasDesdeTramosReales,
} from "@/lib/postVuelo"

const NOVEDADES_VALIDAS = ["SIN_NOVEDAD", "INCIDENTE", "ACCIDENTE"]

async function cargarEscalaConDatos(escalaId) {
  return prisma.escala.findFirst({
    where: { id: escalaId, deleted_at: null },
    select: {
      id: true,
      nro_orden: true,
      estado: true,
      autorizada: true,
      hora_despegue_estimada: true,
      hora_arribo_estimada: true,
      aeronave: { select: { matricula: true } },
      itinerarios: {
        where: { deleted_at: null },
        orderBy: { orden: "asc" },
        select: {
          id: true,
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
        select: { persona_id: true, rol_en_vuelo: true, persona: { select: { grado: true, apellido: true } } },
      },
    },
  })
}

async function cargarPostVueloActivo(escalaId) {
  return prisma.postVuelo.findFirst({
    where: { escala_id: escalaId, deleted_at: null },
  })
}

function validarCamposPostVuelo(body) {
  if (!body.destino_real || !`${body.destino_real}`.trim()) return "El destino real es obligatorio"

  const aterrizajes = Number(body.aterrizajes)
  if (!Number.isInteger(aterrizajes) || aterrizajes < 0) return "Cantidad de aterrizajes inválida"

  if (body.combustible_consumido !== undefined && body.combustible_consumido !== null) {
    const combustible = Number(body.combustible_consumido)
    if (isNaN(combustible) || combustible < 0) return "El combustible consumido no es válido"
  }

  if (body.pasajeros !== undefined && body.pasajeros !== null) {
    const pasajeros = Number(body.pasajeros)
    if (!Number.isInteger(pasajeros) || pasajeros < 0) return "La cantidad de pasajeros no es válida"
  }

  const novedad = body.novedad || "SIN_NOVEDAD"
  if (!NOVEDADES_VALIDAS.includes(novedad)) return "La novedad no es válida"
  if (novedad !== "SIN_NOVEDAD" && !`${body.detalle_novedad || ""}`.trim()) {
    return "Si hay una novedad, tenés que indicar el detalle"
  }

  return null
}

export const GET = conSesion("POST_VUELO", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await cargarEscalaConDatos(escalaId)
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  const esTripulante = esTripulanteDeEscala(escala, session.user.personaId)
  const puedeVer = !!session.user.permisos?.POST_VUELO?.puede_ver || esTripulante
  if (!puedeVer) {
    return NextResponse.json({ error: "No tenés permiso para ver este post-vuelo" }, { status: 403 })
  }

  const postVuelo = await cargarPostVueloActivo(escalaId)

  const puedeCrear = !!session.user.permisos?.POST_VUELO?.puede_crear || esTripulante
  const puedeEditarPostVuelo = !!session.user.permisos?.POST_VUELO?.puede_editar || esTripulante
  const puedeEditarTramos = (puedeCrear || puedeEditarPostVuelo) && ["PROGRAMADA", "CUMPLIDA"].includes(escala.estado)

  // Igual que Escalas, Eliminar depende únicamente del permiso de la
  // matriz (POST_VUELO.puede_eliminar) — sin extenderlo a "o
  // tripulante", a diferencia de crear/editar (borrar es una acción
  // más sensible que corregir).
  const puedeEliminarPostVuelo = !!session.user.permisos?.POST_VUELO?.puede_eliminar

  const calculo = calcularHorasDesdeTramosReales(escala.itinerarios)

  return NextResponse.json({
    escala,
    postVuelo: postVuelo || null,
    puedeCargar: !postVuelo && puedeCrear && puedeCargarPostVuelo(escala),
    puedeEditar: !!postVuelo && puedeEditarPostVuelo,
    puedeEliminarPostVuelo,
    puedeEditarTramos,
    tramosCompletos: calculo.completo,
    horasCalculadas: {
      horas_vuelo_minutos: calculo.horas_vuelo_minutos,
      horas_tierra_minutos: calculo.horas_tierra_minutos,
    },
    defaults: calcularDefaultsPostVuelo(escala),
  })
})

export const POST = conSesion("POST_VUELO", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await cargarEscalaConDatos(escalaId)
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  const esTripulante = esTripulanteDeEscala(escala, session.user.personaId)
  const tienePermisoAmplio = !!session.user.permisos?.POST_VUELO?.puede_crear
  if (!tienePermisoAmplio && !esTripulante) {
    return NextResponse.json({ error: "No tenés permiso para cargar este post-vuelo" }, { status: 403 })
  }

  const existente = await cargarPostVueloActivo(escalaId)
  if (existente) {
    return NextResponse.json({ error: "Esta escala ya tiene un post-vuelo cargado" }, { status: 409 })
  }
  if (!puedeCargarPostVuelo(escala)) {
    return NextResponse.json(
      { error: "Esta escala todavía no está lista para cargar el post-vuelo" },
      { status: 409 }
    )
  }

  const calculo = calcularHorasDesdeTramosReales(escala.itinerarios)
  if (!calculo.completo) {
    return NextResponse.json(
      { error: "Faltan cargar horas reales de algún tramo antes de poder cerrar el post-vuelo" },
      { status: 409 }
    )
  }

  const body = await request.json()
  const errorValidacion = validarCamposPostVuelo(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const creado = await prisma.$transaction(async (tx) => {
    const nuevo = await tx.postVuelo.create({
      data: {
        escala_id: escalaId,
        horas_vuelo_minutos: calculo.horas_vuelo_minutos,
        horas_tierra_minutos: calculo.horas_tierra_minutos,
        total_minutos: calculo.horas_vuelo_minutos + calculo.horas_tierra_minutos,
        destino_real: `${body.destino_real}`.trim(),
        combustible_consumido: body.combustible_consumido ?? null,
        pasajeros: body.pasajeros ?? null,
        aterrizajes: Number(body.aterrizajes),
        novedad: body.novedad || "SIN_NOVEDAD",
        detalle_novedad: body.novedad && body.novedad !== "SIN_NOVEDAD" ? `${body.detalle_novedad}`.trim() : null,
        observaciones: body.observaciones ? `${body.observaciones}`.trim() : null,
        creado_por: session.user.id,
      },
    })

    await tx.escala.update({
      where: { id: escalaId },
      data: { estado: "CUMPLIDA", editado_por: session.user.id },
    })

    return nuevo
  })

  return NextResponse.json(creado, { status: 201 })
})

export const PUT = conSesion("POST_VUELO", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const escala = await cargarEscalaConDatos(escalaId)
  if (!escala) {
    return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
  }

  const postVuelo = await cargarPostVueloActivo(escalaId)
  if (!postVuelo) {
    return NextResponse.json({ error: "Esta escala todavía no tiene post-vuelo cargado" }, { status: 404 })
  }

  const esTripulante = esTripulanteDeEscala(escala, session.user.personaId)
  const tienePermisoAmplio = !!session.user.permisos?.POST_VUELO?.puede_editar
  if (!tienePermisoAmplio && !esTripulante) {
    return NextResponse.json({ error: "No tenés permiso para editar este post-vuelo" }, { status: 403 })
  }

  const calculo = calcularHorasDesdeTramosReales(escala.itinerarios)
  if (!calculo.completo) {
    return NextResponse.json(
      { error: "Faltan horas reales de algún tramo — completalas antes de editar el cierre" },
      { status: 409 }
    )
  }

  const body = await request.json()
  const errorValidacion = validarCamposPostVuelo(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const actualizado = await prisma.postVuelo.update({
    where: { id: postVuelo.id },
    data: {
      horas_vuelo_minutos: calculo.horas_vuelo_minutos,
      horas_tierra_minutos: calculo.horas_tierra_minutos,
      total_minutos: calculo.horas_vuelo_minutos + calculo.horas_tierra_minutos,
      destino_real: `${body.destino_real}`.trim(),
      combustible_consumido: body.combustible_consumido ?? null,
      pasajeros: body.pasajeros ?? null,
      aterrizajes: Number(body.aterrizajes),
      novedad: body.novedad || "SIN_NOVEDAD",
      detalle_novedad: body.novedad && body.novedad !== "SIN_NOVEDAD" ? `${body.detalle_novedad}`.trim() : null,
      observaciones: body.observaciones ? `${body.observaciones}`.trim() : null,
      editado_por: session.user.id,
    },
  })

  return NextResponse.json(actualizado)
})

export const DELETE = conPermiso("POST_VUELO", "puede_eliminar", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const postVuelo = await cargarPostVueloActivo(escalaId)
  if (!postVuelo) {
    return NextResponse.json({ error: "Esta escala no tiene post-vuelo cargado" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    await tx.postVuelo.update({
      where: { id: postVuelo.id },
      data: { deleted_at: new Date(), eliminado_por: session.user.id },
    })

    await tx.escala.update({
      where: { id: escalaId },
      data: { estado: "PROGRAMADA", editado_por: session.user.id },
    })
  })

  return NextResponse.json({ ok: true })
})