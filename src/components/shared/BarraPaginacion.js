"use client"

// src/components/shared/Paginacion.js
//
// Barra de paginación común a todos los listados paginados (rama
// feat/paginacion-servidor). Solo DIBUJA: no sabe de dónde vienen los
// datos ni cómo se cambia de página. Cuando alguien toca un botón,
// llama a onCambiar(nuevaPagina) y cada módulo decide qué hacer:
//   - Registro de Accesos, SICEM y Gestión: actualizan la URL.
//   - Autorizadas: cambia el estado del componente y vuelve a pedir.
//
// Lleva "use client" porque recibe una función (onCambiar) y la usa
// en onClick. Por eso se usa siempre desde un componente de cliente
// (TablaLogIntentos, SicemEventosTable, HistorialEscalas...), nunca
// directo desde un page.js del servidor.
//
// Cómo se ve:
//   - Celular (menos de 640px):
//         21–40 de 312 escalas
//       [‹ Anterior]   Página 2 de 16   [Siguiente ›]
//     Botones de 40px de alto, para tocarlos con el dedo.
//   - Desde 640px:
//       Mostrando 21–40 de 312 escalas     [‹ Anterior] 1 2 3 … 16 [Siguiente ›]
//
// Reglas:
//   - Sin registros (total 0) no dibuja nada: de eso se encarga el
//     mensaje "No se encontraron..." de cada tabla.
//   - Con una sola página muestra solo el texto ("12 escalas"), sin
//     botones — el conteo sigue visible, como el "X de Y" que tenían
//     las tablas antes.
//   - "cargando" deshabilita todos los botones mientras llega la
//     página nueva, para que no se dispare un segundo pedido encima
//     del primero.
//
// Props:
//   pagina        → página actual (empieza en 1)
//   totalPaginas  → total de páginas (de datosPaginacion)
//   total         → total de registros (para "de 312")
//   onCambiar     → (nuevaPagina) => { ... }
//   porPagina     → opcional, por defecto REGISTROS_POR_PAGINA
//   unidad        → opcional: { singular: "escala", plural: "escalas" }
//   cargando      → opcional, deshabilita los botones

import { ChevronLeft, ChevronRight } from "lucide-react"
import { REGISTROS_POR_PAGINA } from "@/lib/paginacion"

// Qué números de página mostrar: siempre la primera, la última, la
// actual y sus vecinas; el resto se resume con "…". Si el hueco es de
// una sola página, se muestra el número en vez de "…" (no tiene
// sentido un "…" que esconde un único número).
//   página 5 de 16 → 1 … 4 5 6 … 16
//   página 1 de 16 → 1 2 … 16
//   página 3 de 16 → 1 2 3 4 … 16
//   página 2 de 4  → 1 2 3 4
function paginasVisibles(pagina, totalPaginas) {
  const candidatas = [1, totalPaginas, pagina - 1, pagina, pagina + 1]
  const ordenadas = [...new Set(candidatas)]
    .filter((p) => p >= 1 && p <= totalPaginas)
    .sort((a, b) => a - b)

  const resultado = []
  let anterior = 0
  for (const p of ordenadas) {
    if (p - anterior === 2) resultado.push(anterior + 1)
    else if (p - anterior > 2) resultado.push("…")
    resultado.push(p)
    anterior = p
  }
  return resultado
}

const CLASE_BOTON =
  "inline-flex items-center justify-center gap-1 h-10 sm:h-9 min-w-10 sm:min-w-9 px-3 rounded-md border text-sm font-medium transition-colors " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"

const CLASE_NORMAL = "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
const CLASE_ACTUAL = "bg-blue-600 border-blue-600 text-white"

export default function Paginacion({
  pagina,
  totalPaginas,
  total,
  onCambiar,
  porPagina = REGISTROS_POR_PAGINA,
  unidad = { singular: "registro", plural: "registros" },
  cargando = false,
}) {
  if (!total) return null

  const palabra = total === 1 ? unidad.singular : unidad.plural
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(pagina * porPagina, total)

  // Una sola página: solo el conteo, sin botones.
  if (totalPaginas <= 1) {
    return (
      <p className="mt-3 text-xs text-gray-500 text-center lg:text-left">
        {total} {palabra}
      </p>
    )
  }

  const hayAnterior = pagina > 1
  const haySiguiente = pagina < totalPaginas

  function ir(nueva) {
    if (cargando || nueva === pagina || nueva < 1 || nueva > totalPaginas) return
    onCambiar(nueva)
  }

  return (
    <nav aria-label="Paginación" className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500 text-center sm:text-left">
        <span className="hidden sm:inline">Mostrando </span>
        {desde}–{hasta} de {total} {palabra}
      </p>

      <div className="flex items-center justify-between gap-2 sm:justify-end sm:gap-1">
        <button
          type="button"
          onClick={() => ir(pagina - 1)}
          disabled={!hayAnterior || cargando}
          className={`${CLASE_BOTON} ${CLASE_NORMAL}`}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        {/* Celular: solo "Página X de Y" entre los dos botones */}
        <span className="sm:hidden text-sm text-gray-600">
          Página {pagina} de {totalPaginas}
        </span>

        {/* Desde 640px: los números */}
        <div className="hidden sm:flex items-center gap-1">
          {paginasVisibles(pagina, totalPaginas).map((p, i) =>
            p === "…" ? (
              <span key={`hueco-${i}`} className="px-1 text-sm text-gray-400" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => ir(p)}
                disabled={cargando}
                aria-current={p === pagina ? "page" : undefined}
                aria-label={`Página ${p}`}
                className={`${CLASE_BOTON} ${p === pagina ? CLASE_ACTUAL : CLASE_NORMAL}`}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => ir(pagina + 1)}
          disabled={!haySiguiente || cargando}
          className={`${CLASE_BOTON} ${CLASE_NORMAL}`}
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  )
}