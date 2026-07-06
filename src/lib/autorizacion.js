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

// Función principal del módulo: chequea si el usuario logueado en la
// sesión tiene un rol administrativo (según ROLES_ADMIN). Se usa como
// guardia de permisos al inicio de los endpoints que solo puede tocar
// un administrador (gestión de usuarios, roles, permisos).
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
