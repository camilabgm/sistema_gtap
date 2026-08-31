// Destino: src/app/api/escalas/[id]/post-vuelo/route.js
//
// CAMBIO: "matriz" ya no se chequea con el bit crudo
// session.user.permisos.POST_VUELO.puede_editar/puede_crear — ese bit
// también es true para Jefe de Combustible, así que le daba acceso
// total sin querer (tramos, destino, novedades — no solo combustible).
// Ahora se chequea contra ROLES_GLOBAL_POST_VUELO (lista fija de 4
// roles), igual que ya se hace en Manifiesto.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion, conPermiso } from "@/lib/api-helpers"
import {
  puedeCargarPostVuelo,
  esTripulanteDeEscala,
  calcularDefaultsPostVuelo,
  calcularHorasDesdeTramosReales,
  ROLES_GLOBAL_POST_VUELO,
} from "@/lib/postVuelo"
import { resolverNombresUsuarios } from "@/lib/auditoria"

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
      // Solo para sugerir pasajeros/carga_kg del post-vuelo a partir de
      // lo ya cargado en Manifiesto — ver calcularDefaultsPostVuelo.
      pasajeros: { where: { deleted_at: null }, select: { id: true } },
      cargas: { where: { deleted_at: null }, select: { peso: true } },
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

  if (body.pasajeros !== undefined && body.pasajeros !== null) {
    const pasajeros = Number(body.pasajeros)
    if (!Number.isInteger(pasajeros) || pasajeros < 0) return "La cantidad de pasajeros no es válida"
  }

  if (body.carga_kg !== undefined && body.carga_kg !== null && body.carga_kg !== "") {
    const cargaKg = Number(body.carga_kg)
    if (isNaN(cargaKg) || cargaKg < 0) return "El peso de carga no es válido"
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
  const esSupervisor = !!session.user.esSupervisorSemana
  const puedeMatriz = ROLES_GLOBAL_POST_VUELO.includes(session.user.rol)

  // Ver: sí incluye a Supervisor de Semana — necesita poder ver el
  // post-vuelo para saber si le falta cargar el combustible, aunque no
  // participe del resto.
  const puedeVer = !!session.user.permisos?.POST_VUELO?.puede_ver || esTripulante || esSupervisor || puedeMatriz
  if (!puedeVer) {
    return NextResponse.json({ error: "No tenés permiso para ver este post-vuelo" }, { status: 403 })
  }

  const postVuelo = await cargarPostVueloActivo(escalaId)

  // "Una sola vez": tripulante puede CREAR el cierre (una vez, en el
  // POST de abajo), pero no volver a editarlo — puedeEditarPostVuelo
  // queda exclusivo de los 4 roles globales.
  //
  // Supervisor de Semana YA NO entra en puedeCrear — según la
  // observación de la matriz, no toca el Post-Vuelo en general, solo
  // el campo de combustible (ver puedeEditarCombustible más abajo).
  const puedeCrear = puedeMatriz || esTripulante
  const puedeEditarPostVuelo = puedeMatriz

  // Tramos: libres de editar mientras no exista el cierre (están
  // "completando" antes de la carga única); una vez creado el
  // post-vuelo, corregir un tramo es lo mismo que editar, así que pasa
  // a depender solo de los 4 roles globales — Jefe de Combustible ya
  // no entra acá.
  const puedeEditarTramos = postVuelo
    ? puedeEditarPostVuelo
    : puedeCrear && escala.estado === "PROGRAMADA"

  // Eliminar sigue dependiendo únicamente del permiso de la matriz —
  // sin bypass de tripulante/supervisor, es una acción más sensible
  // que corregir. Este bit sí se deja tal cual: la matriz ya restringe
  // Eliminar solo a Comandante, Jefe de Combustible no lo tiene.
  const puedeEliminarPostVuelo = !!session.user.permisos?.POST_VUELO?.puede_eliminar

  // Mismo cálculo que el PATCH dedicado (post-vuelo/combustible/route.js)
  // — se repite acá porque la pantalla necesita saber de antemano si
  // mostrar el bloque para cargarlo, sin tener que intentarlo primero.
  const faltaCombustible = postVuelo ? postVuelo.combustible_consumido === null : false
  const puedeEditarCombustible =
    !!postVuelo &&
    (puedeMatriz || ((session.user.rol === "Jefe de Combustible" || esSupervisor) && faltaCombustible))

  const calculo = calcularHorasDesdeTramosReales(escala.itinerarios)

  // Panel de auditoría — resuelve a nombre solo si hay post-vuelo
  // cargado (si no existe todavía, no hay nada que resolver).
  let postVueloConNombres = null
  if (postVuelo) {
    const nombres = await resolverNombresUsuarios([postVuelo.creado_por, postVuelo.editado_por])
    postVueloConNombres = {
      ...postVuelo,
      creado_por_nombre: nombres[postVuelo.creado_por] ?? null,
      editado_por_nombre: postVuelo.editado_por ? nombres[postVuelo.editado_por] ?? null : null,
    }
  }

  return NextResponse.json({
    escala,
    postVuelo: postVueloConNombres,
    puedeCargar: !postVuelo && puedeCrear && puedeCargarPostVuelo(escala),
    puedeEditar: !!postVuelo && puedeEditarPostVuelo,
    puedeEliminarPostVuelo,
    puedeEditarTramos,
    puedeEditarCombustible,
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
  const puedeMatriz = ROLES_GLOBAL_POST_VUELO.includes(session.user.rol)
  // Supervisor de Semana YA NO puede crear el post-vuelo — solo carga
  // combustible después, por el PATCH aparte.
  if (!puedeMatriz && !esTripulante) {
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
        // combustible_consumido NUNCA se acepta acá, aunque venga en el
        // body — se completa después, exclusivamente por PATCH
        // /api/escalas/[id]/post-vuelo/combustible.
        combustible_consumido: null,
        pasajeros: body.pasajeros ?? null,
        carga_kg: body.carga_kg !== undefined && body.carga_kg !== "" ? body.carga_kg : null,
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

  // Editar un post-vuelo ya cargado es EXCLUSIVO de los 4 roles
  // globales — tripulante y Supervisor de Semana ya usaron su única
  // carga al crearlo, y Jefe de Combustible tiene su propio PATCH
  // aparte para el campo de combustible, no este endpoint general.
  const puedeEditarPostVuelo = ROLES_GLOBAL_POST_VUELO.includes(session.user.rol)
  if (!puedeEditarPostVuelo) {
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
      // Los 4 roles globales sí pueden tocar combustible desde acá
      // también — a diferencia de Jefe de Combustible, que solo tiene
      // el PATCH dedicado.
      combustible_consumido: body.combustible_consumido ?? postVuelo.combustible_consumido,
      pasajeros: body.pasajeros ?? null,
      carga_kg: body.carga_kg !== undefined && body.carga_kg !== "" ? body.carga_kg : null,
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