// src/lib/paginacion.js
//
// Piezas compartidas de la paginación del lado del SERVIDOR (rama
// feat/paginacion-servidor). Funciones puras, sin React: las usan
// tanto las páginas del servidor (page.js con Prisma) como los
// endpoints (route.js) y el componente <Paginacion>.
//
// Por qué paginar en el servidor y no en el navegador: si el servidor
// manda 3.000 registros y el navegador muestra 20, la lentitud sigue
// igual — viajan los 3.000 igual. Lo que hace rápido al sistema es
// pedirle a Prisma solo esa página (skip/take) más un count para saber
// cuántas páginas hay.
//
// Uso típico en un page.js o route.js:
//
//   const paginaPedida = leerPagina(params.pagina)
//   const total = await prisma.modelo.count({ where })
//   const { pagina, totalPaginas, skip, take } = datosPaginacion(paginaPedida, total)
//   const registros = await prisma.modelo.findMany({
//     where,
//     orderBy: [{ created_at: "desc" }, { id: "desc" }],   // ← desempate por id
//     skip,
//     take,
//   })
//
// El count va ANTES que el findMany (y no en paralelo) porque el skip
// depende de saber si la página pedida existe: si alguien pide la
// página 9 y solo hay 8, se le muestra la 8, no una página vacía.
//
// Desempate por id: toda consulta paginada tiene que terminar su
// orderBy con el id. Si dos registros tienen la misma fecha, la base
// puede devolverlos en cualquier orden — y entre una página y la
// siguiente un registro podría repetirse o no aparecer nunca.
//
// CAMBIO (commit 2, Registro de Accesos): suma ESPERA_BUSQUEDA_MS.
// CAMBIO (commit 3, SICEM Eventos): suma leerTextoParam, que antes
// estaba copiada en cada page.js.

// La cantidad por página, en un solo lugar: cambiarla es tocar esta
// línea y nada más.
export const REGISTROS_POR_PAGINA = 20

// Pausa (en milisegundos) DESPUÉS DE LA ÚLTIMA TECLA antes de que un
// buscador consulte al servidor. No es un límite para escribir: el
// reloj se reinicia con cada letra, así que mientras se siga tecleando
// no se consulta nada. Entre tecla y tecla pasan unos 150–250ms al
// escribir normal; 400 deja margen para no consultar a mitad de una
// palabra sin que el buscador se sienta trabado. La usan los buscadores
// de Registro de Accesos y Gestión de Escalas.
export const ESPERA_BUSQUEDA_MS = 400

// Convierte lo que venga en la URL (?pagina=...) en un número de
// página seguro. Cualquier cosa rara devuelve 1 en vez de romper la
// consulta:
//   "3"   → 3        "abc" → 1        "-5" → 1
//   "2.5" → 1        ""    → 1        undefined → 1
//   ["4", "7"] → 4   (si la URL trae ?pagina=4&pagina=7, vale la primera)
export function leerPagina(valor) {
  const texto = Array.isArray(valor) ? valor[0] : valor
  const numero = Number(texto)
  return Number.isInteger(numero) && numero >= 1 ? numero : 1
}

// Convierte un parámetro de texto de la URL (?usuario=, ?estado=...)
// en un texto limpio. En una página del servidor, cada parámetro puede
// llegar como texto, como lista (si se repite: ?estado=a&estado=b
// llega como ["a", "b"]) o no llegar. Siempre devuelve texto, sin
// espacios en los bordes:
//   " gon " → "gon"     ["a", "b"] → "a"     undefined → ""
export function leerTextoParam(valor) {
  const texto = Array.isArray(valor) ? valor[0] : valor
  return typeof texto === "string" ? texto.trim() : ""
}

// A partir de la página pedida y el total de registros (el count),
// calcula todo lo que hace falta para la consulta y para el
// componente <Paginacion>:
//   pagina       → la página que se va a mostrar de verdad (si la
//                  pedida no existe, la última que sí existe)
//   totalPaginas → siempre al menos 1, aunque no haya registros
//   skip, take   → listos para pasarle a prisma.findMany
//   total        → el mismo total, para mostrar "Mostrando 21–40 de 312"
//
// Ejemplo con 45 registros:
//   datosPaginacion(2, 45)  → { pagina: 2, totalPaginas: 3, skip: 20, take: 20, total: 45 }
//   datosPaginacion(9, 45)  → { pagina: 3, totalPaginas: 3, skip: 40, take: 20, total: 45 }
export function datosPaginacion(paginaPedida, total, porPagina = REGISTROS_POR_PAGINA) {
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina))
  const pagina = Math.min(Math.max(1, paginaPedida), totalPaginas)
  return {
    pagina,
    totalPaginas,
    skip: (pagina - 1) * porPagina,
    take: porPagina,
    total,
  }
}