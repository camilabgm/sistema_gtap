// src/lib/cascadaAutorizacion.js
//
// Calcula QUIÉN tiene la potestad de autorizar una escala en este
// momento, recorriendo la cascada de 5 cargos como un fallback de un
// solo autorizante a la vez (nunca aprobación multinivel obligatoria).
//
// Para cada cargo de la cascada se revisan dos posiciones en orden:
// primero el TITULAR (orden 1), después el ADJUNTO (orden 2). Recién si
// ninguno de los dos sirve, se pasa al siguiente cargo.
//
// Para cada posición se hacen hasta dos chequeos, en este orden:
//   1) SOLO para el TITULAR (orden 1): ¿su Rol actual todavía
//      corresponde a este cargo? El ADJUNTO no tiene este chequeo — su
//      Rol nunca tiene por qué coincidir con el nombre del cargo (su
//      Rol refleja su función real: Piloto, Copiloto, General, etc.),
//      así que evaluarlo por Rol lo descartaría siempre, sin importar
//      si está disponible o no.
//   2) Para titular Y adjunto: ¿está disponible ahora mismo? (en vuelo
//      / parte diario / derivación)
//
// Se usa al publicar una escala.

import prisma from "@/lib/prisma"
import { estaDisponibleAhora } from "@/lib/disponibilidad"
import { rolCoincideConCargo } from "@/lib/autorizacion"

// Orden de la cascada de autorización. Es un fallback: si titular y
// adjunto de un cargo no sirven, se pasa al siguiente cargo.
export const CASCADA_AUTORIZACION = [
  "JEFE_OPERACIONES",
  "COMANDANTE",
  "CMDTE_ESC_AEREO",
  "CMDTE_ESC_MANTENIMIENTO",
  "JEFE_PERSONAL",
]

// Evalúa UNA posición puntual (titular o adjunto) de un cargo. Es el
// bloque que se reutiliza dos veces por cargo, para no duplicar la
// lógica entre titular y adjunto.
//
// Devuelve uno de estos tres resultados:
//   { resultado: "AUTORIZA", personaId }
//     → esta persona sirve, es el autorizante.
//   { resultado: "SALTAR", motivo, personaId }
//     → hay alguien cargado, pero no sirve ahora mismo (motivo:
//       ROL_DESACTUALIZADO — solo titular —, EN_VUELO, PARTE_DIARIO o
//       DERIVACION_MANUAL).
//   { resultado: "SIN_ASIGNAR", personaId: null }
//     → no hay nadie cargado en esta posición para este cargo.
async function evaluarPosicion(rol, orden) {
  const cargo = await prisma.cargoAutorizacion.findFirst({
    where: { rol_autorizador: rol, orden, activo: true, deleted_at: null },
    select: {
      usuario: {
        select: {
          persona_id: true,
          rol: { select: { nombre: true } },
        },
      },
    },
  })

  // Nadie cargado en esta posición (ej. nunca se asignó adjunto)
  if (!cargo) {
    return { resultado: "SIN_ASIGNAR", personaId: null }
  }

  const personaId = cargo.usuario.persona_id
  const nombreRolActual = cargo.usuario.rol?.nombre ?? null

  // Chequeo 1 (barato): ¿su Rol actual todavía corresponde a este cargo?
  // SOLO aplica al titular (orden 1) — el adjunto nunca tiene un Rol que
  // deba coincidir con el nombre del cargo, así que este chequeo no le
  // corresponde y se salta directo al Chequeo 2.
  if (orden === 1 && !rolCoincideConCargo(nombreRolActual, rol)) {
    return { resultado: "SALTAR", motivo: "ROL_DESACTUALIZADO", personaId }
  }

  // Chequeo 2: ¿está disponible ahora mismo?
  const disponibilidad = await estaDisponibleAhora(personaId)
  if (disponibilidad.disponible) {
    return { resultado: "AUTORIZA", personaId }
  }

  return { resultado: "SALTAR", motivo: disponibilidad.motivo, personaId }
}

// Recorre la cascada completa (titular → adjunto → siguiente cargo) y
// arma el historial de pasos para EscalaAutorizacion. Cada fila explica,
// con su propio motivo_escalamiento, por qué la responsabilidad LLEGÓ a
// esa posición: la primera fila siempre es "INICIAL"; si esa persona no
// sirve, la razón queda anotada en la fila SIGUIENTE. Así, leer solo la
// última fila alcanza para saber quién autoriza ahora y por qué.
//
// Devuelve { autorizanteRol, autorizantePersonaId, pasos }.
// Si nadie en toda la cascada sirve, autorizantePersonaId es null.
export async function calcularAutorizanteActivo() {
  const pasos = []
  let motivoDeEsteRol = "INICIAL"

  for (const rol of CASCADA_AUTORIZACION) {
    // Primero el titular (orden 1), después el adjunto (orden 2)
    for (const orden of [1, 2]) {
      const evaluacion = await evaluarPosicion(rol, orden)

      pasos.push({
        rol_autorizador: rol,
        persona_id: evaluacion.personaId,
        motivo_escalamiento: motivoDeEsteRol,
      })

      if (evaluacion.resultado === "AUTORIZA") {
        return { autorizanteRol: rol, autorizantePersonaId: evaluacion.personaId, pasos }
      }

      motivoDeEsteRol = evaluacion.resultado === "SIN_ASIGNAR" ? "SIN_ASIGNAR" : evaluacion.motivo
    }
  }

  // Nadie en toda la cascada (ni titulares ni adjuntos) pudo autorizar
  return { autorizanteRol: null, autorizantePersonaId: null, pasos }
}