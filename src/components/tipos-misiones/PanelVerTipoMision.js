"use client"

// Panel de solo lectura para Tipos de Misión — mismo criterio visual
// que PanelVerAeronave.js, para que "Ver" se comporte igual en todos
// los módulos.

import SeparadorSeccion from "@/components/shared/SeparadorSeccion"

const ETIQUETAS_CLASIFICACION = {
  OPERACIONAL: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  TIPO_VUELO:  { label: "Tipo de Vuelo", color: "bg-purple-100 text-purple-700" },
  LOGISTICA:   { label: "Logística", color: "bg-amber-100 text-amber-700" },
}

export default function PanelVerTipoMision({ tipoMision, onCerrar }) {
  const t = tipoMision
  const clasi = ETIQUETAS_CLASIFICACION[t.clasificacion] || { label: t.clasificacion, color: "bg-gray-100 text-gray-600" }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onCerrar}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>

        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Detalle de tipo de misión</h2>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">✕</button>
        </div>

        <div className="px-6 py-4 space-y-4">

          <div>
            <SeparadorSeccion texto="Detalle" />
            <div className="grid grid-cols-1 gap-3 pt-2">
              <div>
                <div className="text-xs uppercase text-gray-400">Código</div>
                <div className="text-sm font-mono font-semibold text-gray-900">{t.codigo}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Nombre</div>
                <div className="text-sm font-medium text-gray-900">{t.nombre}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Clasificación</div>
                <span className={`inline-block mt-0.5 px-2 py-1 rounded-full text-xs font-medium ${clasi.color}`}>
                  {clasi.label}
                </span>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Sub-tipo</div>
                <div className="text-sm font-medium text-gray-900">
                  {t.tiene_subtipo ? (t.subtipo || "Sí, sin especificar") : "No tiene"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-400">Descripción</div>
                <div className="text-sm text-gray-700">{t.descripcion || "—"}</div>
              </div>
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