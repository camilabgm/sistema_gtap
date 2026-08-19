"use client"

import { useState, useEffect } from "react"
import PanelDetalleEscala from "./PanelDetalleEscala"
import { useTick } from "@/lib/useTick"
import { ETIQUETAS_ESTADO, calcularEstadoVisual, calcularVentanaEnElDia, formatearHora } from "@/lib/escalas"

const MINUTOS_EN_DIA = 24 * 60
const HORAS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))

const COLORES_ESTADO = {
  PROGRAMADA:    "#3b82f6",
  EN_DESARROLLO: "#f59e0b",
  SIN_REGISTRAR: "#8b5cf6",
  CUMPLIDA:      "#22c55e",
  ABORTADA:      "#ef4444",
}

function porcentaje(minutos) {
  return (minutos / MINUTOS_EN_DIA) * 100
}

// hoyISO llega como prop desde AgendaEscalas (calculado UNA sola vez ahí,
// con la misma lógica que usa para "qué día es hoy" en toda la pantalla).
// Antes este componente lo recalculaba acá adentro con
// new Date().toISOString() — UTC — mientras minutosAhora usaba
// getHours()/getMinutes() — hora local del navegador. Mezclaba dos
// criterios distintos en la misma función, lo que podía hacer que
// "¿hoy?" diera false en el momento equivocado. Recibirlo por prop
// asegura que todo el Gantt use el mismo "hoy" que el resto de la Agenda.
export default function GanttAeronavesDia({ escalasDelDia, fechaSeleccionada, hoyISO, onActualizada }) {
  const [aeronaves, setAeronaves] = useState([])
  const [cargando, setCargando] = useState(true)
  const [escalaExpandidaId, setEscalaExpandidaId] = useState(null)

  useTick()

  useEffect(() => {
    fetch("/api/aeronaves", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAeronaves(Array.isArray(data) ? data : []))
      .finally(() => setCargando(false))
  }, [])

  const esHoy = fechaSeleccionada === hoyISO
  const minutosAhora = esHoy ? new Date().getHours() * 60 + new Date().getMinutes() : null

  const escalaExpandida = escalasDelDia.find((e) => e.id === escalaExpandidaId) || null

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
    <div>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

        <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-b border-gray-100 text-xs text-gray-500">
          {Object.entries(ETIQUETAS_ESTADO).map(([estado, etiqueta]) => (
            <div key={estado} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORES_ESTADO[estado] }} />
              {etiqueta}
            </div>
          ))}
        </div>

        <div className="flex border-b border-gray-100">
          <div className="w-36 shrink-0 px-3 py-2 text-xs text-gray-400">Aeronave</div>
          <div className="flex-1 relative h-7">
            {HORAS.map((h, i) => (
              <span
                key={h}
                className="absolute top-2 text-[10px] text-gray-400"
                style={{ left: `${(i / HORAS.length) * 100}%` }}
              >
                {h}
              </span>
            ))}
          </div>
        </div>

        <div className="relative divide-y divide-gray-100">

          <div className="absolute inset-0 flex pointer-events-none" style={{ left: "9rem" }}>
            {HORAS.map((h) => (
              <div key={h} className="flex-1 border-l border-gray-50" />
            ))}
          </div>

          {esHoy && (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
              style={{ left: `calc(9rem + ${porcentaje(minutosAhora)}%)` }}
            />
          )}

          {aeronaves.map((aeronave) => {
            const escalasDeEsta = escalasDelDia.filter((e) => e.aeronave?.matricula === aeronave.matricula)
            const disponible = aeronave.estado === "DISPONIBLE"

            return (
              <div key={aeronave.id} className="flex items-center">
                <div className="w-36 shrink-0 px-3 py-3">
                  <p className="text-sm font-medium text-gray-900">{aeronave.matricula}</p>
                  <p className="text-xs text-gray-400">{aeronave.tipo}</p>
                  <span
                    className={`mt-1 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {disponible ? "Disp." : "No disp."}
                  </span>
                </div>
                <div className="flex-1 relative h-14">
                  {escalasDeEsta.map((e) => {
                    const ventana = calcularVentanaEnElDia(e.hora_despegue_estimada, e.hora_arribo_estimada, fechaSeleccionada)
                    if (!ventana) return null
                    const { minutosInicio, minutosFin, continuaAntes, continuaDespues } = ventana

                    const estadoVisual = calcularEstadoVisual(e)
                    const colorBase = COLORES_ESTADO[estadoVisual] || COLORES_ESTADO.PROGRAMADA
                    const primerTramo = e.itinerarios?.[0]
                    const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
                    const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen}→${ultimoTramo.destino}` : ""
                    const duracion = minutosFin - minutosInicio
                    const textoCompleto = `${formatearHora(e.hora_despegue_estimada)} ${ruta}`

                    return (
                      <button
                        key={e.id}
                        title={textoCompleto}
                        onClick={() => setEscalaExpandidaId(escalaExpandidaId === e.id ? null : e.id)}
                        className={`absolute top-2 bottom-2 rounded-md px-1.5 flex items-center justify-center overflow-hidden text-left cursor-pointer transition-opacity hover:opacity-90 ${
                          escalaExpandidaId === e.id ? "ring-2 ring-offset-1 ring-gray-400" : ""
                        }`}
                        style={{
                          left: `${porcentaje(minutosInicio)}%`,
                          width: `${porcentaje(duracion)}%`,
                          minWidth: "26px",
                          backgroundColor: colorBase,
                        }}
                      >
                        {duracion >= 60 ? (
                          <p className="text-xs font-medium truncate text-white w-full">
                            {continuaAntes && "◀ "}{formatearHora(e.hora_despegue_estimada)} {ruta}{continuaDespues && " ▶"}
                          </p>
                        ) : (
                          <span className="text-xs text-white">{continuaDespues ? "▶" : "●"}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {escalaExpandida && (
        <div className="mt-2">
          <PanelDetalleEscala
            escala={escalaExpandida}
            puedeEditar={false}
            mostrarPostVuelo={false}
            onCerrar={() => setEscalaExpandidaId(null)}
            onActualizada={onActualizada}
          />
        </div>
      )}
    </div>
  )
}