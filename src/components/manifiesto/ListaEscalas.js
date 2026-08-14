// Panel izquierdo: buscador + lista de escalas con estado, ruta,
// aeronave y cantidad de pasajeros cargados.

const ESTADOS = {
  PROGRAMADA:    { label: "Programada", dot: "bg-blue-500",   texto: "text-blue-700",   fondo: "bg-blue-50" },
  EN_DESARROLLO: { label: "En vuelo",   dot: "bg-amber-500",  texto: "text-amber-700",  fondo: "bg-amber-50" },
  CUMPLIDA:      { label: "Completada", dot: "bg-green-500",  texto: "text-green-700",  fondo: "bg-green-50" },
  ABORTADA:      { label: "Abortada",   dot: "bg-red-500",    texto: "text-red-700",    fondo: "bg-red-50" },
  RECHAZADA:     { label: "Rechazada",  dot: "bg-gray-400",   texto: "text-gray-600",   fondo: "bg-gray-50" },
}

function Badge({ estado }) {
  const cfg = ESTADOS[estado] ?? ESTADOS.PROGRAMADA
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.texto} ${cfg.fondo}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}

function formatearFechaCorta(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso))
}

function formatearHoraCorta(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", { timeZone: "America/Asuncion", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso))
}

export default function ListaEscalas({ escalas, cargando, busqueda, onBuscar, escalaSeleccionadaId, onSeleccionar }) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-3">
        <input
          type="text"
          placeholder="Buscar escala..."
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {cargando && <div className="p-4 text-sm text-gray-400">Cargando escalas…</div>}

        {!cargando && escalas.length === 0 && (
          <div className="p-4 text-sm text-gray-400">No se encontraron escalas.</div>
        )}

        {!cargando && escalas.map((e) => {
          const seleccionada = e.id === escalaSeleccionadaId
          return (
            <button
              key={e.id}
              onClick={() => onSeleccionar(e.id)}
              className={`block w-full border-b border-gray-100 p-3 text-left transition-colors ${
                seleccionada ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatearFechaCorta(e.fecha)} · {formatearHoraCorta(e.hora_despegue_estimada)}</span>
                <Badge estado={e.estado} />
              </div>
              <div className="mt-1 font-medium text-gray-900">
                {e.origen ?? "—"} → {e.destino ?? "—"}
              </div>
              <div className="mt-0.5 text-xs text-gray-400">
                  Escala #{e.id}{e.nro_orden ? ` · Orden #${e.nro_orden}` : ""}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {e.aeronave_matricula ?? "Sin aeronave"} · {e.cantidad_pasajeros} persona{e.cantidad_pasajeros === 1 ? "" : "s"}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { ESTADOS, Badge, formatearFechaCorta, formatearHoraCorta }