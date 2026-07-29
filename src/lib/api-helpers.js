import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import { esAdministrador } from "@/lib/autorizacion"

// Función base: valida que haya sesión, corre el chequeo que se le pasa,
// y envuelve el handler en try/catch. No se usa directamente en los
// route.js — los atajos de abajo (conPermiso, conAdmin, conSesion) arman
// el chequeo correcto para cada caso.
//
// "modulo" es solo para identificar el log de errores (ej. "AERONAVES"),
// no reemplaza el chequeo de permiso en sí.
function conAutorizacion(modulo, chequeo, handler) {
  return async function (request, context) {
    try {
      const session = await getServerSession(authOptions)
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
// meta-administración (asignar permisos) o acciones reservadas por
// definición a esos dos roles (ej. habilitar operacionalmente).
export function conAdmin(modulo, handler) {
  return conAutorizacion(modulo, (session) => esAdministrador(session), handler)
}

// Caso especial: solo exige que haya sesión iniciada, sin ningún permiso
// de módulo. Se usa para acciones de autoservicio, donde cualquier usuario
// logueado puede actuar sobre sus propios datos (ej. cambiar su contraseña).
export function conSesion(modulo, handler) {
  return conAutorizacion(modulo, () => true, handler)
}