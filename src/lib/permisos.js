// Chequeo centralizado de permisos por módulo, para usar en cada page.js
// protegido. Evita repetir `session?.user?.permisos?.MODULO?.accion` a mano
// en cada archivo, y reduce el riesgo de errores de tipeo en el nombre del
// módulo (ej. "TIPOSMISION" en vez de "TIPOS_MISIONES"), que hoy fallarían
// en silencio devolviendo siempre "sin permiso".

const MODULOS_VALIDOS = [
  "PERSONAS",
  "AERONAVES",
  "TIPOS_MISIONES",
  "ESCALAS",
  "POST_VUELO",
  "MANIFIESTO",
  "SICEM",
  "INFORMES",
]

export function tienePermiso(session, modulo, accion = "puede_ver") {
  if (!MODULOS_VALIDOS.includes(modulo)) {
    console.error(
      `tienePermiso: módulo desconocido "${modulo}". Revisá el nombre contra MODULOS_VALIDOS en src/lib/permisos.js.`
    )
  }
  return !!session?.user?.permisos?.[modulo]?.[accion]
}