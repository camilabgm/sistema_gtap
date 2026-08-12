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
// Para cada posición se hacen hasta tres chequeos, en este orden:
//   1) Para titular Y adjunto: ¿la cuenta de Usuario está activa, Y la
//      Persona detrás de esa cuenta también? CargoAutorizacion ya
//      impide asignar a alguien inactivo DESDE el vamos (ver
//      cargos-autorizacion/route.js) — este chequeo cubre el caso
//      posterior: alguien que estaba bien asignado y DESPUÉS quedó
//      inactivo, sea porque se le restringió el acceso puntualmente, o
//      porque directamente causó baja del GTAP. Las dos causas
//      terminan en el mismo resultado (no puede autorizar), así que
//      comparten un solo motivo — no hace falta distinguirlas.
//      Se mira también persona.activo, no solo usuario.activo, como
//      red de seguridad ante datos de antes del fix que hace que
//      desactivar una Persona cascada a su Usuario (personas/[id]/route.js).
//   2) SOLO para el TITULAR (orden 1): ¿su Rol actual todavía
//      corresponde a este cargo? El ADJUNTO no tiene este chequeo — su
//      Rol nunca tiene por qué coincidir con el nombre del cargo (su
//      Rol refleja su función real: Piloto, Copiloto, General, etc.),
//      así que evaluarlo por Rol lo descartaría siempre, sin importar
//      si está disponible o no.
//   3) Para titular Y adjunto: ¿está disponible ahora mismo? (en vuelo
//      / parte diario / derivación)
//
// Se usa al publicar una escala, y para calcular quién puede
// autorizar/rechazar en cualquier momento posterior.

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
//       CUENTA_INACTIVA, ROL_DESACTUALIZADO — solo titular —, EN_VUELO,
//       PARTE_DIARIO o DERIVACION_MANUAL).
//   { resultado: "SIN_ASIGNAR", personaId: null }
//     → no hay nadie cargado en esta posición para este cargo.
async function evaluarPosicion(rol, orden) {
  const cargo = await prisma.cargoAutorizacion.findFirst({
    where: { rol_autorizador: rol, orden, activo: true, deleted_at: null },
    select: {
      usuario: {
        select: {
          persona_id: true,
          activo: true,
          rol: { select: { nombre: true } },
          persona: { select: { activo: true } },
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

  // Chequeo 1 (el más barato, y aplica a titular Y adjunto por igual):
  // ¿la cuenta de Usuario sigue activa, Y la Persona detrás también?
  // Cubre tanto "le restringieron el acceso puntualmente" como "causó
  // baja del GTAP" — las dos terminan en el mismo resultado.
  if (!cargo.usuario.activo || !cargo.usuario.persona.activo) {
    return { resultado: "SALTAR", motivo: "CUENTA_INACTIVA", personaId }
  }

  // Chequeo 2: ¿su Rol actual todavía corresponde a este cargo? SOLO
  // aplica al titular (orden 1) — el adjunto nunca tiene un Rol que
  // deba coincidir con el nombre del cargo, así que este chequeo no le
  // corresponde y se salta directo al Chequeo 3.
  if (orden === 1 && !rolCoincideConCargo(nombreRolActual, rol)) {
    return { resultado: "SALTAR", motivo: "ROL_DESACTUALIZADO", personaId }
  }

  // Chequeo 3: ¿está disponible ahora mismo?
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
// última fila alcanza para saber quién autoriza ahora, por qué, y si
// esa posición es titular (orden 1) o adjunto (orden 2) del cargo.
//
// Devuelve { autorizanteRol, autorizantePersonaId, autorizanteOrden, pasos }.
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
        orden,
        motivo_escalamiento: motivoDeEsteRol,
      })

      if (evaluacion.resultado === "AUTORIZA") {
        return {
          autorizanteRol: rol,
          autorizantePersonaId: evaluacion.personaId,
          autorizanteOrden: orden,
          pasos,
        }
      }

      motivoDeEsteRol = evaluacion.resultado === "SIN_ASIGNAR" ? "SIN_ASIGNAR" : evaluacion.motivo
    }
  }

  // Nadie en toda la cascada (ni titulares ni adjuntos) pudo autorizar
  return { autorizanteRol: null, autorizantePersonaId: null, autorizanteOrden: null, pasos }
}