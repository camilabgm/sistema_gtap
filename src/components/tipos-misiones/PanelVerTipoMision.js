"use client"

// src/components/tipos-misiones/PanelVerTipoMision.js
//
// Panel de solo lectura para Tipos de Misión — mismo criterio visual
// que PanelVerAeronave.js, para que "Ver" se comporte igual en todos
// los módulos.
//
// CAMBIO (rama fix/responsive-modales): usa la cáscara compartida
// ModalBase. Como es solo lectura, tocar el fondo sí lo cierra.

import SeparadorSeccion from "@/components/shared/SeparadorSeccion"
import ModalBase from "@/components/shared/ModalBase"

const ETIQUETAS_CLASIFICACION = {
  OPERACIONAL: { label: "Operacional", color: "bg-blue-100 text-blue-700" },
  TIPO_VUELO:  { label: "Tipo de Vuelo", color: "bg-purple-100 text-purple-700" },
  LOGISTICA:   { label: "Logística", color: "bg-amber-100 text-amber-700" },
}

export default function PanelVerTipoMision({ tipoMision, onCerrar }) {
  const t = tipoMision
  const clasi = ETIQUETAS_CLASIFICACION[t.clasificacion] || { label: t.clasificacion, color: "bg-gray-100 text-gray-600" }

  return (
    <ModalBase
      titulo="Detalle de tipo de misión"
      onCerrar={onCerrar}
      ancho="md"
      cerrarAlTocarFondo
      pie={
        <button onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          Cerrar
        </button>
      }
    >
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
          <div className="text-sm text-gray-700 break-words">{t.descripcion || "—"}</div>
        </div>
      </div>
    </ModalBase>
  )
}