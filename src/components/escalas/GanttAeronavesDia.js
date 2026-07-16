"use client"

// Vista de aeronaves por hora (Gantt de un día). Recibe las escalas del
// día ya filtradas por AgendaEscalas — no pide datos de escalas propios,
// solo la lista de aeronaves para pintar todas las filas de la flota
// (incluso las que no vuelan ese día).

import { useState, useEffect } from "react"

const MINUTOS_EN_DIA = 24 * 60
const ETIQUETAS_HORA = ["00", "02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22"]

const ESTILOS_ESTADO = {
  PROGRAMADA:    { bg: "bg-blue-100",  text: "text-blue-700"  },
  EN_DESARROLLO: { bg: "bg-amber-100", text: "text-amber-700" },
  CUMPLIDA:      { bg: "bg-green-100", text: "text-green-700" },
  ABORTADA:      { bg: "bg-red-100",   text: "text-red-700"   },
}

const ETIQUETAS_ESTADO = {
  PROGRAMADA: "Programada",
  EN_DESARROLLO: "En vuelo",
  CUMPLIDA: "Cumplida",
  ABORTADA: "Abortada",
}

const ETIQUETAS_MOTIVO_ABORTO = {
  ADOS: "Orden superior",
  ADFM: "Falta de material",
  ADCA: "Condición de la aeronave",
  ADCM: "Condiciones meteorológicas",
  ADTI: "Técnica de instrucción",
  ADCP: "Condiciones del piloto",
}

function minutosDelDia(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function formatearHora(iso) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" })
}

function porcentaje(minutos) {
  return (minutos / MINUTOS_EN_DIA) * 100
}

export default function GanttAeronavesDia({ escalasDelDia, fechaSeleccionada }) {
  const [aeronaves, setAeronaves] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch("/api/aeronaves", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAeronaves(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [])

  const hoyISO = new Date().toISOString().slice(0, 10)
  const esHoy = fechaSeleccionada === hoyISO
  const minutosAhora = esHoy ? new Date().getHours() * 60 + new Date().getMinutes() : null

  if (cargando) {
    return <p className="text-sm text-gray-400">Cargando aeronaves...</p>
  }

  if (aeronaves.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
        No hay aeronaves activas cargadas en el sistema.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
        {Object.entries(ETIQUETAS_ESTADO).map(([estado, etiqueta]) => (
          <div key={estado} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-sm ${ESTILOS_ESTADO[estado].bg}`} />
            {etiqueta}
          </div>
        ))}
      </div>

      {/* Encabezado de horas */}
      <div className="flex border-b border-gray-100">
        <div className="w-36 shrink-0 px-3 py-2 text-xs text-gray-400">Aeronave</div>
        <div className="flex-1 relative h-8">
          {ETIQUETAS_HORA.map((h, i) => (
            <span
              key={h}
              className="absolute top-2 text-xs text-gray-400"
              style={{ left: `${(i / ETIQUETAS_HORA.length) * 100}%` }}
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Filas por aeronave */}
      <div className="relative divide-y divide-gray-100">

        {/* Líneas verticales de referencia cada 2 horas, atraviesan todas las filas */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ left: "9rem" }}>
          {ETIQUETAS_HORA.map((h) => (
            <div key={h} className="flex-1 border-l border-gray-50" />
          ))}
        </div>

        {/* Línea de "ahora" — solo si el día mostrado es hoy */}
        {esHoy && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
            style={{ left: `calc(9rem + ${porcentaje(minutosAhora)}%)` }}
          />
        )}

        {aeronaves.map((aeronave) => {
          const escalasDeEsta = escalasDelDia.filter((e) => e.aeronave?.matricula === aeronave.matricula)

          return (
            <div key={aeronave.id} className="flex items-center">
              <div className="w-36 shrink-0 px-3 py-3">
                <p className="text-sm font-medium text-gray-900">{aeronave.matricula}</p>
                <p className="text-xs text-gray-400">{aeronave.tipo}</p>
              </div>
              <div className="flex-1 relative h-14">
                {escalasDeEsta.map((e) => {
                  const inicio = minutosDelDia(e.hora_despegue_estimada)
                  if (inicio === null) return null

                  let fin = minutosDelDia(e.hora_arribo_estimada) ?? inicio + 60
                  fin = Math.min(fin, MINUTOS_EN_DIA)

                  const estilo = ESTILOS_ESTADO[e.estado] || ESTILOS_ESTADO.PROGRAMADA
                  const primerTramo = e.itinerarios?.[0]
                  const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
                  const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen}→${ultimoTramo.destino}` : ""
                  const detalleAborto = e.estado === "ABORTADA" && e.motivo_abortada
                    ? (ETIQUETAS_MOTIVO_ABORTO[e.motivo_abortada] || e.motivo_abortada)
                    : null

                  return (
                    <div
                      key={e.id}
                      className={`absolute top-2 bottom-2 rounded-md px-2 flex flex-col justify-center overflow-hidden ${estilo.bg}`}
                      style={{
                        left: `${porcentaje(inicio)}%`,
                        width: `${Math.max(porcentaje(fin - inicio), 4)}%`,
                      }}
                    >
                      <p className={`text-xs font-medium truncate ${estilo.text}`}>
                        {formatearHora(e.hora_despegue_estimada)} {ruta}
                      </p>
                      {detalleAborto && (
                        <p className={`text-xs truncate ${estilo.text}`}>{detalleAborto}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}