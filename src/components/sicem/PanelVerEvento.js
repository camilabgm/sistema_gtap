"use client"

// src/components/sicem/PanelVerEvento.js
//
// Panel de solo lectura para un Evento de Mantenimiento — mismo
// criterio que PanelVerAeronave/PanelVerTipoMision, más PanelAuditoria
// al final, igual que PanelPostVuelo.
//
// CAMBIO (rama fix/responsive-modales): usa la cáscara compartida
// ModalBase (tocar el fondo sí cierra: es solo lectura). Datos en 1
// columna en celular, 2 desde 640px. Los badges pueden partirse en
// dos renglones.

import SeparadorSeccion from "@/components/shared/SeparadorSeccion"
import PanelAuditoria from "@/components/shared/PanelAuditoria"
import ModalBase from "@/components/shared/ModalBase"

const ETIQUETAS_TIPO = {
  PROGRAMADO: "Programado",
  NO_PROGRAMADO: "No programado",
  CALENDARIO: "Calendario",
}
const ETIQUETAS_COMPONENTE = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}
const ETIQUETAS_LUGAR = {
  INTERNO: "Interno",
  TERCERIZADO: "Tercerizado",
}

export default function PanelVerEvento({ evento, onCerrar }) {
  const ev = evento

  return (
    <ModalBase
      titulo="Detalle del evento"
      onCerrar={onCerrar}
      ancho="lg"
      cerrarAlTocarFondo
      pie={
        <button onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
          Cerrar
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            {ETIQUETAS_TIPO[ev.tipo] || ev.tipo}
          </span>
          {ev.cerrado ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ Cerrado</span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">● Abierto</span>
          )}
          {ev.es_cambio_componente && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Reseteó un componente</span>
          )}
        </div>

        <div>
          <SeparadorSeccion texto="Datos del evento" />
          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-gray-400">Aeronave</div>
              <div className="text-sm font-medium text-gray-900">{ev.aeronave?.matricula}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-400">Componente afectado</div>
              <div className="text-sm font-medium text-gray-900">
                {ev.componente ? (ETIQUETAS_COMPONENTE[ev.componente.tipo] || ev.componente.tipo) : "Ninguno en particular"}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase text-gray-400">Lugar</div>
              <div className="text-sm font-medium text-gray-900">{ev.lugar ? (ETIQUETAS_LUGAR[ev.lugar] || ev.lugar) : "Sin definir"}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-gray-400">Observación</div>
              <div className="text-sm text-gray-700 break-words">{ev.observacion || "—"}</div>
            </div>
          </div>
        </div>

        <SeparadorSeccion texto="Auditoría" />
        <PanelAuditoria
          items={[
            { etiqueta: "Creado por", nombre: ev.creado_por_nombre, fecha: ev.created_at },
            { etiqueta: "Editado por", nombre: ev.editado_por_nombre, fecha: ev.updated_at },
            ...(ev.cerrado ? [{ etiqueta: "Cerrado por", nombre: ev.cerrado_por_nombre, fecha: ev.cerrado_en }] : []),
          ]}
        />
      </div>
    </ModalBase>
  )
}