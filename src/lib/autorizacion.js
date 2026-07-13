// src/lib/autorizacion.js
//
//  Funciones centrales de AUTORIZACIÓN (¿quién puede hacer qué?).
//
//  La idea: en vez de repetir la regla "quién es administrador" en cada
//  endpoint, la definimos UNA sola vez acá. Todos los endpoints la usan.
//  El día que cambie quién administra, se cambia SOLO este archivo.
//
//  Esta lista debe coincidir con el ROLES_ADMIN del Navbar, para que la
//  interfaz y los endpoints usen la misma regla.
// ─────────────────────────────────────────────────────────────────────

// Roles que pueden administrar el sistema (permisos, usuarios, roles).
export const ROLES_ADMIN = ["Comandante", "Jefe de Operaciones"]

// Devuelve true si la sesión corresponde a un usuario administrador.
// Uso en un endpoint:
//   if (!esAdministrador(sesion)) {
//     return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
//   }
export function esAdministrador(sesion) {
  // Sin sesión → no es administrador (ni siquiera está logueado)
  if (!sesion || !sesion.user) {
    return false
  }
  // ¿El rol del usuario está en la lista de administradores?
  return ROLES_ADMIN.includes(sesion.user.rol)
}

// ─────────────────────────────────────────────────────────────────────
//  CARGOS DE AUTORIZACIÓN DE ESCALAS (cascada de 5 puestos)
//
//  El enum RolAutorizador (en schema.prisma) define QUÉ cargos existen
//  en la cascada. Esta constante conecta cada valor del enum con el
//  nombre real que tiene ese cargo en la tabla `roles` — el mismo
//  nombre que se le asigna a un usuario cuando se le da acceso al
//  sistema. Se usa para dos cosas:
//
//   1) Filtrar el buscador de usuarios en la pantalla de administración
//      de Cargos de Autorización (solo mostrar personas cuyo Rol actual
//      corresponda al cargo que se está asignando).
//   2) La verificación en tiempo real dentro de la cascada de
//      autorización: antes de dejar que alguien autorice una escala
//      como titular o adjunto de un cargo, confirmar que su Rol actual
//      todavía es el que corresponde — por si cambió de puesto después
//      de haber sido asignado en CargoAutorizacion.
// ─────────────────────────────────────────────────────────────────────

export const ROL_NOMBRE_POR_CARGO_AUTORIZACION = {
  COMANDANTE: "Comandante",
  JEFE_OPERACIONES: "Jefe de Operaciones",
  CMDTE_ESC_AEREO: "Comandante del Escuadrón Aéreo",
  CMDTE_ESC_MANTENIMIENTO: "Comandante del Escuadrón de Mantenimiento",
  JEFE_PERSONAL: "Jefe de Personal",
}

// Verifica si el Rol actual de un usuario todavía corresponde al cargo
// de autorización que se le quiere validar.
//
// nombreRolUsuario  → el Rol.nombre actual del usuario (ej. "Jefe de Operaciones")
// cargoAutorizador  → un valor del enum RolAutorizador (ej. "JEFE_OPERACIONES")
//
// Devuelve true/false. Si el cargo no existe en el mapeo (no debería
// pasar, pero por las dudas), devuelve false en vez de romper.
export function rolCoincideConCargo(nombreRolUsuario, cargoAutorizador) {
  const nombreEsperado = ROL_NOMBRE_POR_CARGO_AUTORIZACION[cargoAutorizador]
  if (!nombreEsperado) return false
  return nombreRolUsuario === nombreEsperado
}