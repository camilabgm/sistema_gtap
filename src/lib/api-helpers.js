// src/lib/api-helpers.js
//
// Wrappers que centralizan sesión + chequeo de permiso + try/catch para
// los route.js de la API. Evitan repetir el mismo bloque en cada archivo.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import { esAdministrador } from "@/lib/autorizacion"

// Función base: valida que haya sesión, corre el chequeo que se le pasa,
// y envuelve el handler en try/catch. No se usa directamente en los
// route.js — los atajos de abajo (conPermiso, conAdmin, conCascada,
// conSesion) arman el chequeo correcto para cada caso.
//
// "modulo" es solo para identificar el log de errores (ej. "AERONAVES"),
// no reemplaza el chequeo de permiso en sí.
function conAutorizacion(modulo, chequeo, handler) {
  return async function (request, context) {
    try {
      const session = await getServerSession(authOptions)
       console.log("DEBUG sesión recibida:", session)
      if (!session) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        
      }
      if (!chequeo(session)) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 })
      }
      return await handler(request, context, session)
    } catch (error) {
      console.error(`Error en ${modulo} (${request.method}):`, error)
      return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
    }
  }
}

// Caso común: exige un permiso puntual de un módulo, ej. AERONAVES.puede_crear
export function conPermiso(modulo, accion, handler) {
  return conAutorizacion(modulo, (session) => tienePermiso(session, modulo, accion), handler)
}

// Caso especial: exige ser Comandante o Jefe de Operaciones (ROLES_ADMIN),
// sin importar el permiso puntual del módulo. Se usa para funciones de
// meta-administración o acciones reservadas por definición a esos dos roles.
export function conAdmin(modulo, handler) {
  return conAutorizacion(modulo, (session) => esAdministrador(session), handler)
}

// NUEVO: exige que la persona logueada tenga hoy un cargo activo en la
// cascada de autorización (titular o adjunto de alguno de los 5 puestos).
// Mismo molde que conAdmin, cambiando el chequeo. El valor ya viene
// calculado en la sesión (usuarioTieneCargoDeCascada, en auth.js), así
// que acá no hace falta ninguna consulta extra a la base.
export function conCascada(modulo, handler) {
  return conAutorizacion(modulo, (session) => !!session.user.esCargoDeCascada, handler)
}

// Caso especial: solo exige que haya sesión iniciada, sin ningún permiso
// de módulo. Se usa para acciones de autoservicio, donde cualquier usuario
// logueado puede actuar sobre sus propios datos, o donde el propio handler
// hace una combinación de chequeos que no encaja en un wrapper genérico
// (ej. "permiso amplio O sos tripulante de esta escala puntual").
export function conSesion(modulo, handler) {
  return conAutorizacion(modulo, () => true, handler)
}