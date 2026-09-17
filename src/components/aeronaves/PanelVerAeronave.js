"use client"

// Panel de solo lectura para Aeronaves — mismo criterio visual que
// PanelPostVuelo.js (SeparadorSeccion, grid de datos, badges), pero
// en modal en vez de inline, porque Aeronaves es una tabla+modal, no
// tiene una página de detalle propia como Escalas.

import SeparadorSeccion from "@/components/shared/SeparadorSeccion"

const ETIQUETAS_MOTIVO = {
  ACCIDENTADA: "Accidentada",
  EN_MANTENIMIENTO: "En mantenimiento",
  OTRO: "Otro",
}

function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m}min`
}

export default function PanelVerAeronave({ aeronave, onCerrar }) {
  const a = aeronave

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Detalle de aeronave</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="px-6 py-4 space-y-5">

          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              a.categoria === "PROPIA" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
            }`}>
              {a.categoria === "PROPIA" ? "Propia" : "Incautada"}
            </span>
            {a.estado === "DISPONIBLE" ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Disponible</span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {a.motivo_no_disponible === "OTRO" ? (a.motivo_otro || "Otro") : (ETIQUETAS_MOTIVO[a.motivo_no_disponible] || "No disponible")}
              </span>
            )}
            {a.tiene_evento_abierto && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Gestionado por SICEM</span>
            )}
          </div>

          <div>
            <SeparadorSeccion texto="Datos de la aeronave" />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="text-xs uppercase text-gray-400">Matrícula</div>
                <div className="text-sm font-medium text-gray-900">{a.matricula}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Tipo / Modelo</div>
                <div className="text-sm font-medium text-gray-900">{a.tipo}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Fabricante</div>
                <div className="text-sm font-medium text-gray-900">{a.fabricante}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Año de fabricación</div>
                <div className="text-sm font-medium text-gray-900">{a.anio_fabricacion}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Año de incorporación</div>
                <div className="text-sm font-medium text-gray-900">{a.anio_incorporacion}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Capacidad de pasajeros</div>
                <div className="text-sm font-medium text-gray-900">{a.capacidad_pasajeros}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Combustible</div>
                <div className="text-sm font-medium text-gray-900">{a.tipo_combustible || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Velocidad de crucero</div>
                <div className="text-sm font-medium text-gray-900">{a.velocidad_crucero ? `${a.velocidad_crucero} nudos` : "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Estela de turbulencia</div>
                <div className="text-sm font-medium text-gray-900">{a.estela_turbulencia || "—"}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Color / Descripción</div>
                <div className="text-sm font-medium text-gray-900">{a.color || "—"}</div>
              </div>
            </div>
          </div>

          <div>
            <SeparadorSeccion texto="SICEM — se edita solo desde ese módulo" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <div className="text-xs uppercase text-gray-400">Horas totales de vuelo</div>
                <div className="text-sm font-medium text-gray-900">{formatearMinutos(a.horas_vuelo_totales_minutos)}</div>
              </div>
              {a.trackea_ciclos_aterrizajes ? (
                <>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Ciclos acumulados</div>
                    <div className="text-sm font-medium text-gray-900">{a.ciclos_acumulados}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase text-gray-400">Aterrizajes acumulados</div>
                    <div className="text-sm font-medium text-gray-900">{a.aterrizajes_acumulados}</div>
                  </div>
                </>
              ) : (
                <div className="col-span-2">
                  <div className="text-xs uppercase text-gray-400">Ciclos / Aterrizajes</div>
                  <div className="text-sm text-gray-400">Esta aeronave no los trackea</div>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}