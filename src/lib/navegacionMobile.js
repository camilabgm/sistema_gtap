// src/lib/navegacionMobile.js
//
// Arma qué 4 íconos van fijos en la barra de navegación inferior de
// mobile y cuáles caen dentro de "Más" — sin duplicar la matriz de
// permisos. La única fuente de verdad de "qué puede ver este usuario"
// sigue siendo session.user.permisos, calculado una sola vez en el
// login (ver auth.js) — acá NO se vuelve a consultar tienePermiso() ni
// la base de datos, solo se lee lo que ya vino en la sesión.
//
// La prioridad de la lista maestra no es "qué tan grande es el
// módulo", es "cuántos roles distintos lo usan como acción primaria
// en campo, parados junto a la aeronave". Escalas queda primero
// porque es el único módulo donde tripulación Y los roles con acceso
// global tienen ahí una acción real (consultar/crear/aprobar), no
// solo consulta pasiva.

export const LISTA_MAESTRA_MOBILE = [
  { modulo: "ESCALAS",        iconKey: "escalas" },
  { modulo: "POST_VUELO",     iconKey: "postVuelo" },
  { modulo: "MANIFIESTO",     iconKey: "manifiesto" },
  { modulo: "SICEM",          iconKey: "sicem" },
  { modulo: "INFORMES",       iconKey: "informes" },
  { modulo: "AERONAVES",      iconKey: "aeronaves" },
  { modulo: "PERSONAS",       iconKey: "personas" },
  { modulo: "TIPOS_MISIONES", iconKey: "tiposMisiones" },
  { modulo: "PARTE_DIARIO",   iconKey: "parteDiario" },
]

const MAX_ICONOS_FIJOS = 4

// Arma la lista de items visibles para la barra inferior de este
// usuario puntual, ya separada entre "fijos" (hasta 4) y "resto" (va
// dentro de "Más"). No hace fetch de nada acá adentro — el conteo de
// cada badge se calcula en el componente, vía useBadgesDashboard, el
// mismo hook que ya usa Navbar.js.
//
// permisos          → session.user.permisos (objeto por módulo)
// esCargoDeCascada  → session.user.esCargoDeCascada (boolean, ya
//                      calculado en login — nunca se recalcula acá)
//
// Devuelve { fijos: [...], resto: [...] }, cada item con la forma:
//   { modulo, iconKey, label, ruta }
export function armarNavegacionMobile(permisos, esCargoDeCascada) {
  const visibles = LISTA_MAESTRA_MOBILE
    .filter((item) => !!permisos?.[item.modulo]?.puede_ver)
    .map((item) => resolverItem(item, esCargoDeCascada))

  return {
    fijos: visibles.slice(0, MAX_ICONOS_FIJOS),
    resto: visibles.slice(MAX_ICONOS_FIJOS),
  }
}

// El único módulo con doble audiencia es Escalas: tripulación lo usa
// para consultar su propio vuelo (Agenda), los roles con acceso
// global lo usan para aprobar/crear. Mismo módulo, mismo permiso —
// cambia solo la etiqueta y a qué pantalla lleva por defecto.
function resolverItem(item, esCargoDeCascada) {
  if (item.modulo === "ESCALAS") {
    return esCargoDeCascada
      ? { ...item, label: "Aprobaciones", ruta: "/dashboard/escalas/pendientes-autorizar" }
      : { ...item, label: "Mis Vuelos", ruta: "/dashboard/escalas" }
  }

  const LABELS_Y_RUTAS = {
    POST_VUELO:     { label: "Post-Vuelo",        ruta: "/dashboard/post-vuelo" },
    MANIFIESTO:     { label: "Manifiesto",        ruta: "/dashboard/manifiesto" },
    SICEM:          { label: "SICEM",             ruta: "/dashboard/sicem/componentes" },
    INFORMES:       { label: "Informes",          ruta: "/dashboard/informes" },
    AERONAVES:      { label: "Aeronaves",         ruta: "/dashboard/aeronaves" },
    PERSONAS:       { label: "Personas",          ruta: "/dashboard/personas" },
    TIPOS_MISIONES: { label: "Tipos de Misiones", ruta: "/dashboard/tipos-misiones" },
    PARTE_DIARIO:   { label: "Parte Diario",      ruta: "/dashboard/parte-diario" },
  }

  return { ...item, ...LABELS_Y_RUTAS[item.modulo] }
}