// src/lib/sicemSincronizacion.js
//
// NUEVO (rama fix/sicem-sincronizacion-post-vuelo): la ÚNICA puerta
// por la que Post-Vuelo, Escalas y Eventos tocan las horas de SICEM
// (odómetro de la aeronave y horas acumuladas de motor/hélice).
//
// A diferencia de lib/sicem.js — funciones puras, sin Prisma — acá SÍ
// se escribe en la base. Cada función recibe `tx`, la transacción del
// endpoint que la llama: el ajuste de SICEM y el cambio que lo origina
// (cerrar, editar o borrar un vuelo) se guardan juntos, o no se guarda
// ninguno.
//
// ─────────────────────────────────────────────────────────────────────
//  LA REGLA: "¿dónde viven HOY las horas de este vuelo?"
//
//  Cuando se cierra un Post-Vuelo, sus horas se suman a la aeronave y a
//  los componentes que en ese momento estaban contando. Si después ese
//  vuelo se edita o se borra, la diferencia tiene que ir EXACTAMENTE a
//  donde terminaron esas horas — que no siempre es el componente:
//
//  Para cada componente, se busca el primer "corte" posterior al cierre
//  del vuelo:
//    - sin corte            → las horas siguen en el componente: se
//                             ajusta el componente.
//    - RESET_POR_EVENTO     → las horas se fueron con el componente
//                             viejo, que quedó guardado en la "foto"
//                             del reset: se ajusta la foto, no el
//                             componente nuevo.
//    - EDICION_MANUAL que
//      cambió horas         → alguien verificó el valor a mano; ese
//                             valor manda: no se ajusta nada.
//
//  Además, un componente que NO estaba contando cuando se cerró el vuelo
//  (se cargó o se reactivó después, o está desactivado hoy) no se toca:
//  nunca recibió esas horas.
//
//  La aeronave no tiene resets: su odómetro solo se saltea si alguien
//  lo corrigió a mano después del cierre (horas_totales_ajustadas_en).
//
//  En todos los casos dudosos, el error posible deja horas DE MÁS
//  (el sistema avisa antes del overhaul), nunca de menos.
// ─────────────────────────────────────────────────────────────────────

import prisma from "@/lib/prisma"
import { COMPONENTES_AUTO_ACTUALIZABLES } from "@/lib/sicem"

// Las filas de historial que "cortan" el camino de las horas.
const CORTES_DE_HORAS = [
  { motivo: "RESET_POR_EVENTO" },
  { motivo: "EDICION_MANUAL", cambiaron_horas: true },
]

function esPosterior(a, b) {
  return new Date(a).getTime() > new Date(b).getTime()
}

// Desde cuándo el componente está contando los vuelos del sistema: la
// fecha más reciente entre su creación y su última reactivación.
function inicioDelConteo(componente) {
  if (componente.activo_desde && esPosterior(componente.activo_desde, componente.created_at)) {
    return componente.activo_desde
  }
  return componente.created_at
}

// ── Cerrar un Post-Vuelo ────────────────────────────────────────────
// Suma las horas de un vuelo RECIÉN cerrado: odómetro de la aeronave y
// componentes auto-actualizables activos. Mismo comportamiento que la
// sincronización original de post-vuelo/route.js.
export async function sumarHorasDeVueloNuevo(tx, aeronaveId, minutos) {
  if (!aeronaveId || !minutos) return

  await tx.aeronave.update({
    where: { id: aeronaveId },
    data: { horas_vuelo_totales_minutos: { increment: minutos } },
  })

  await tx.componenteMantenimiento.updateMany({
    where: {
      aeronave_id: aeronaveId,
      tipo: { in: COMPONENTES_AUTO_ACTUALIZABLES },
      deleted_at: null,
      activo: true,
    },
    data: { horas_acumuladas_minutos: { increment: minutos } },
  })
}

// ── Un componente: aplicar la regla ─────────────────────────────────
// Lleva deltaMinutos (positivo o negativo) a donde viven hoy las horas
// que el componente tenía en el instante `desde`.
//
// La usan ajustarHorasDeVueloCerrado (con `desde` = cierre del vuelo) y
// el borrado de un Evento con reset (con `desde` = momento del reset,
// después de borrar la fila del reset: ver sicem/eventos/[id]).
export async function ajustarHorasEnComponente(tx, { componenteId, desde, deltaMinutos, usuarioId = null }) {
  if (!deltaMinutos) return

  const corte = await tx.historialComponenteMantenimiento.findFirst({
    where: {
      componente_id: componenteId,
      created_at: { gt: desde },
      OR: CORTES_DE_HORAS,
    },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  })

  if (!corte) {
    await tx.componenteMantenimiento.update({
      where: { id: componenteId },
      data: {
        horas_acumuladas_minutos: { increment: deltaMinutos },
        ...(usuarioId ? { editado_por: usuarioId } : {}),
      },
    })
    return
  }

  if (corte.motivo === "RESET_POR_EVENTO") {
    // La foto del componente que se retiró en ese reset — ahí quedaron
    // las horas. Se corrige para que, si algún día se borra ese reset,
    // la restauración parta del número correcto.
    await tx.historialComponenteMantenimiento.update({
      where: { id: corte.id },
      data: { horas_acumuladas_minutos: { increment: deltaMinutos } },
    })
    return
  }

  // EDICION_MANUAL que cambió horas: el valor corregido a mano manda.
}

// ── Editar o borrar un vuelo ya cerrado ─────────────────────────────
// cerradoEn = PostVuelo.created_at (el momento en que sus horas se
// sumaron). deltaMinutos: diferencia al editar, o -horas al borrar.
export async function ajustarHorasDeVueloCerrado(tx, { aeronaveId, cerradoEn, deltaMinutos }) {
  if (!aeronaveId || !deltaMinutos) return

  // Aeronave — se saltea solo si el odómetro se corrigió a mano DESPUÉS
  // del cierre de este vuelo.
  const aeronave = await tx.aeronave.findUnique({
    where: { id: aeronaveId },
    select: { horas_totales_ajustadas_en: true },
  })
  if (aeronave) {
    const corregidoDespues =
      aeronave.horas_totales_ajustadas_en && esPosterior(aeronave.horas_totales_ajustadas_en, cerradoEn)
    if (!corregidoDespues) {
      await tx.aeronave.update({
        where: { id: aeronaveId },
        data: { horas_vuelo_totales_minutos: { increment: deltaMinutos } },
      })
    }
  }

  // Componentes — solo los que hoy están activos y ya contaban horas
  // cuando se cerró el vuelo.
  const componentes = await tx.componenteMantenimiento.findMany({
    where: {
      aeronave_id: aeronaveId,
      tipo: { in: COMPONENTES_AUTO_ACTUALIZABLES },
      deleted_at: null,
      activo: true,
    },
    select: { id: true, created_at: true, activo_desde: true },
  })

  for (const c of componentes) {
    if (esPosterior(inicioDelConteo(c), cerradoEn)) continue
    await ajustarHorasEnComponente(tx, { componenteId: c.id, desde: cerradoEn, deltaMinutos })
  }
}

// ── Caso 8: ¿este Post-Vuelo originó un Evento de Mantenimiento? ────
// Si lo originó, ni la escala ni el Post-Vuelo se pueden borrar: el
// Evento quedaría huérfano (aeronave No disponible, quizás un componente
// reseteado, y nadie sabría por qué). Que lo decida una persona desde
// SICEM.
export async function buscarEventoOriginado(postVueloId) {
  if (!postVueloId) return null
  return prisma.eventoMantenimiento.findFirst({
    where: { post_vuelo_id: postVueloId, deleted_at: null },
    select: { id: true, aeronave: { select: { matricula: true } } },
  })
}

export function mensajeEventoOriginado(evento, queSeQuiereBorrar) {
  const matricula = evento.aeronave?.matricula ? ` de ${evento.aeronave.matricula}` : ""
  return (
    `No se puede eliminar ${queSeQuiereBorrar}: su post-vuelo originó el Evento de Mantenimiento ` +
    `#${evento.id}${matricula} en SICEM. Si el incidente fue un error, eliminá primero ese evento ` +
    `desde SICEM; si fue real, el vuelo tiene que quedar registrado.`
  )
}