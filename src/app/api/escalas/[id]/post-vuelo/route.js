// Destino: src/app/api/escalas/[id]/post-vuelo/route.js
//
// CAMBIO: "matriz" ya no se chequea con el bit crudo
// session.user.permisos.POST_VUELO.puede_editar/puede_crear — ese bit
// también es true para Jefe de Combustible, así que le daba acceso
// total sin querer (tramos, destino, novedades — no solo combustible).
// Ahora se chequea contra ROLES_GLOBAL_POST_VUELO (lista fija de 4
// roles), igual que ya se hace en Manifiesto.
//
// CAMBIO (SICEM): al crear, editar o eliminar el cierre, se sincroniza
// el "odómetro" de la aeronave (horas_vuelo_totales_minutos) y sus
// componentes auto-actualizables (motor, hélice) vía
// sincronizarSicemPorTramo(). Editar suma solo la DIFERENCIA entre el
// valor nuevo y el anterior — no el valor completo de nuevo, para no
// duplicar horas ya contadas. Eliminar resta lo que se había sumado,
// porque el post-vuelo vuelve la escala a PROGRAMADA (como si el
// tramo nunca se hubiera cerrado).

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
import { COMPONENTES_AUTO_ACTUALIZABLES } from "@/lib/sicem"
import { resolverNombresUsuarios } from "@/lib/auditoria"

const NOVEDADES_VALIDAS = ["SIN_NOVEDAD", "INCIDENTE", "ACCIDENTE"]

// SICEM — ver comentario de cabecera. Si la escala no tiene aeronave
// asignada (aeronave_id null) o el delta es 0, no hay nada que hacer.
async function sincronizarSicemPorTramo(tx, aeronaveId, deltaMinutos) {
  if (!aeronaveId || !deltaMinutos) return

  await tx.aeronave.update({
    where: { id: aeronaveId },
    data: { horas_vuelo_totales_minutos: { increment: deltaMinutos } },
  })

  await tx.componenteMantenimiento.updateMany({
    where: {
      aeronave_id: aeronaveId,
      tipo: { in: COMPONENTES_AUTO_ACTUALIZABLES },
      deleted_at: null,
      activo: true,
    },
    data: { horas_acumuladas_minutos: { increment: deltaMinutos } },
  })
}

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
      aeronave_id: true, // SICEM — necesario para saber a qué aeronave sincronizar
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
    // SICEM — se agrega el aeronave_id de la escala para poder
    // revertir la sincronización al eliminar, sin tener que volver a
    // consultar la escala completa en el DELETE.
    include: { escala: { select: { aeronave_id: true } } },
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

  const puedeVer = !!session.user.permisos?.POST_VUELO?.puede_ver || esTripulante || esSupervisor || puedeMatriz
  if (!puedeVer) {
    return NextResponse.json({ error: "No tenés permiso para ver este post-vuelo" }, { status: 403 })
  }

  const postVuelo = await cargarPostVueloActivo(escalaId)

  const puedeCrear = puedeMatriz || esTripulante
  const puedeEditarPostVuelo = puedeMatriz

  const puedeEditarTramos = postVuelo
    ? puedeEditarPostVuelo
    : puedeCrear && escala.estado === "PROGRAMADA"

  const puedeEliminarPostVuelo = !!session.user.permisos?.POST_VUELO?.puede_eliminar

  const faltaCombustible = postVuelo ? postVuelo.combustible_consumido === null : false
  const puedeEditarCombustible =
    !!postVuelo &&
    (puedeMatriz || ((session.user.rol === "Jefe de Combustible" || esSupervisor) && faltaCombustible))

  const calculo = calcularHorasDesdeTramosReales(escala.itinerarios)

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

    // SICEM — recién ahora existen horas de vuelo reales para sumar.
    await sincronizarSicemPorTramo(tx, escala.aeronave_id, calculo.horas_vuelo_minutos)

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

  // SICEM — solo se sincroniza la DIFERENCIA respecto de lo que ya
  // estaba sumado. Si las horas del tramo no cambiaron, delta es 0 y
  // sincronizarSicemPorTramo no toca nada.
  const deltaMinutos = calculo.horas_vuelo_minutos - postVuelo.horas_vuelo_minutos

  const actualizado = await prisma.$transaction(async (tx) => {
    const actualizado = await tx.postVuelo.update({
      where: { id: postVuelo.id },
      data: {
        horas_vuelo_minutos: calculo.horas_vuelo_minutos,
        horas_tierra_minutos: calculo.horas_tierra_minutos,
        total_minutos: calculo.horas_vuelo_minutos + calculo.horas_tierra_minutos,
        destino_real: `${body.destino_real}`.trim(),
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

    await sincronizarSicemPorTramo(tx, postVuelo.escala.aeronave_id, deltaMinutos)

    return actualizado
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

    // SICEM — revierte lo que este tramo había sumado, como si nunca
    // se hubiera cerrado (mismo criterio que el estado de la escala,
    // que vuelve a PROGRAMADA).
    await sincronizarSicemPorTramo(tx, postVuelo.escala.aeronave_id, -postVuelo.horas_vuelo_minutos)
  })

  return NextResponse.json({ ok: true })
})