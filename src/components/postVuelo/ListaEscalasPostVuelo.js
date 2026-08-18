// Panel izquierdo de Post-Vuelo — mismo patrón visual que
// ListaEscalas.js de Manifiesto: buscador + lista con resaltado en
// ámbar para "te toca a vos". El estado mostrado no es el estado real
// de la escala (PROGRAMADA/CUMPLIDA) sino si ya tiene post-vuelo
// cargado o no, que es lo operativamente relevante acá.

function BadgePostVuelo({ tienePostVuelo }) {
  return tienePostVuelo ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Completada
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Por reportar
    </span>
  )
}

function formatearHoraCorta(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", { timeZone: "America/Asuncion", hour: "2-digit", minute: "2-digit", hour12: false })
    .format(new Date(iso))
}

function formatearFechaCorta(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso))
}

export default function ListaEscalasPostVuelo({
  escalas,
  cargando,
  error,
  busqueda,
  onBuscar,
  escalaSeleccionadaId,
  onSeleccionar,
}) {
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

        {!cargando && error && <div className="p-4 text-sm text-red-600">{error}</div>}

        {!cargando && !error && escalas.length === 0 && (
          <div className="p-4 text-sm text-gray-400">No se encontraron escalas.</div>
        )}

        {!cargando && !error && escalas.map((e) => {
          const primerTramo = e.itinerarios?.[0]
          const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
          const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "Sin itinerario"

          const seleccionada = e.id === escalaSeleccionadaId
          const resaltar = e.te_corresponde && !seleccionada

          return (
            <button
              key={e.id}
              onClick={() => onSeleccionar(e.id)}
              className={`block w-full border-b border-gray-100 p-3 text-left transition-colors ${
                seleccionada ? "bg-blue-50" : resaltar ? "bg-amber-50 hover:bg-amber-100" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{formatearFechaCorta(e.fecha)} · {formatearHoraCorta(e.hora_despegue_estimada)}</span>
                <BadgePostVuelo tienePostVuelo={e.tiene_post_vuelo} />
              </div>
              <div className="mt-1 flex items-center gap-2 font-medium text-gray-900">
                <span>{e.aeronave?.matricula || "Sin aeronave"} · {ruta}</span>
                {e.te_corresponde && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Te toca
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-gray-400">
                Escala #{e.id}{e.nro_orden ? ` · Orden #${e.nro_orden}` : ""}
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {(e.tripulacion || []).map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ") || "Sin tripulación"}
                {e.tipo_mision?.codigo ? ` · ${e.tipo_mision.codigo}` : ""}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}