"use client"

import { useState, useEffect, useCallback } from "react"
import { useTick } from "@/lib/useTick"
import { ETIQUETAS_ESTADO, ETIQUETAS_MOTIVO_ABORTO, calcularEstadoVisual, estaPendienteDeAutorizacion, formatearRangoVuelo } from "@/lib/escalas"
import { puedeCargarPostVuelo } from "@/lib/postVuelo"
import { manifiestoEstaCerrado } from "@/lib/manifiesto"
import { formatearFechaHora } from "@/lib/fechaHora"
import SeparadorSeccion from "@/components/shared/SeparadorSeccion"
import PanelAuditoria from "@/components/shared/PanelAuditoria"

const ETIQUETAS_ROL_ACUSE = {
  PILOTO: "Piloto",
  COPILOTO: "Copiloto",
  TECNICO_DE_VUELO: "Técnico de Vuelo",
  SUPERVISOR_SEMANA: "Supervisor de Semana",
}

// NOTA: "Abortar escala" ya NO vive acá — se movió a
// AbortarEscalaAccion.js, disponible como ícono en la fila de
// Gestión de Escalas. El detalle completo de Post-Vuelo (tramos,
// horas, destino, combustible, etc.) TAMPOCO vive acá — queda
// exclusivamente en su propio módulo (PanelPostVuelo), al que ya se
// accede con un click desde el ícono de Post-Vuelo en la misma fila.
// Repetirlo acá era duplicar información sin agregar nada, y hacía la
// fila expandida demasiado larga para lo que Gestión necesita (barrer
// muchas escalas rápido, no leer el detalle de una). Este panel
// (usado también por Agenda, que es de solo lectura) queda con
// información básica + acuse + auditoría de los tres módulos. La prop
// puedeEditar queda sin uso interno por ahora, se deja en la firma por
// compatibilidad con quien la siga pasando.
export default function PanelDetalleEscala({ escala, puedeEditar, mostrarPostVuelo = true, onCerrar, onActualizada }) {
  useTick() // el estado visual (Programada/En vuelo) se actualiza solo

  const e = escala
  const estadoVisual = calcularEstadoVisual(e)
  const pendiente = estaPendienteDeAutorizacion(e)
  const primerTramo = e.itinerarios?.[0]
  const ultimoTramo = e.itinerarios?.[e.itinerarios.length - 1]
  const ruta = primerTramo && ultimoTramo ? `${primerTramo.origen} → ${ultimoTramo.destino}` : "Sin itinerario cargado"

  // ── Manifiesto — solo para el panel de auditoría ────────────────
  // MANIFIESTO.puede_ver es Ver=true para todos los roles según la
  // matriz, así que este fetch nunca debería dar 403 sin importar
  // quién esté mirando este panel (Gestión o Agenda).
  const [manifiestoData, setManifiestoData] = useState(null)

  useEffect(() => {
    fetch(`/api/manifiesto/${e.id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setManifiestoData)
      .catch(() => setManifiestoData(null))
  }, [e.id])

  // ── Acuse de Recibo ─────────────────────────────────────────────
  const [acuse, setAcuse] = useState(null)
  const [acuseCargando, setAcuseCargando] = useState(true)
  const [acuseError, setAcuseError] = useState(null)
  const [acuseGuardando, setAcuseGuardando] = useState(false)

  const cargarAcuse = useCallback(() => {
    setAcuseCargando(true)
    setAcuseError(null)
    fetch(`/api/escalas/${e.id}/acuse`, { credentials: "include" })
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || "Error al consultar el acuse")
        return data
      })
      .then((data) => setAcuse(data.acuse))
      .catch((err) => setAcuseError(err.message))
      .finally(() => setAcuseCargando(false))
  }, [e.id])

  useEffect(() => {
    cargarAcuse()
  }, [cargarAcuse])

  async function handleAcusarRecibo() {
    setAcuseError(null)
    setAcuseGuardando(true)
    try {
      const res = await fetch(`/api/escalas/${e.id}/acuse`, { method: "PUT", credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al acusar recibo")
      onActualizada?.()
      cargarAcuse()
    } catch (err) {
      setAcuseError(err.message)
    } finally {
      setAcuseGuardando(false)
    }
  }

  // ── Post-Vuelo — SOLO para completar la auditoría ────────────────
  // Ya no se renderiza ningún detalle acá (tramos, horas, combustible,
  // etc.) — eso vive únicamente en PanelPostVuelo. Este fetch se
  // mantiene solo para tener creado_por_nombre/editado_por_nombre
  // disponibles en itemsAuditoria, más abajo.
  const relevantePostVuelo = mostrarPostVuelo && (e.estado === "CUMPLIDA" || puedeCargarPostVuelo(e))
  const [pvData, setPvData] = useState(null)

  // ── Panel de auditoría — Escala + Manifiesto + Post-Vuelo juntos ──
  // Cada fila dice explícitamente a qué módulo pertenece. Si un dato
  // no existe (ej. todavía no se editó nada), PanelAuditoria ya lo
  // filtra solo — no hace falta lógica extra acá para "si no se tocó,
  // mostrar solo el creador": eso ya pasa porque *_editado_por_nombre
  // viene null hasta que alguien realmente edite.
  const itemsAuditoria = [
    { etiqueta: "Escala creada por", nombre: e.creado_por_nombre, fecha: e.created_at },
    { etiqueta: "Escala editada por", nombre: e.editado_por_nombre, fecha: e.updated_at },
    { etiqueta: "Escala autorizada por", nombre: e.autorizada_por_nombre, fecha: e.fecha_autorizacion },
    { etiqueta: "Manifiesto cargado por", nombre: manifiestoData?.manifiesto_creado_por_nombre, fecha: manifiestoData?.manifiesto_creado_en },
    { etiqueta: "Manifiesto cerrado por", nombre: manifiestoData?.manifiesto_cerrado_por_nombre, fecha: manifiestoData?.manifiesto_cerrado_en },
    ...(manifiestoData && !manifiestoData.manifiesto_cerrado && manifiestoEstaCerrado(manifiestoData)
      ? [{ etiqueta: "Manifiesto cerrado", nombre: "Automáticamente (venció la hora de despegue)", fecha: manifiestoData.hora_despegue_estimada }]
      : []),
    { etiqueta: "Post-vuelo cargado por", nombre: pvData?.postVuelo?.creado_por_nombre, fecha: pvData?.postVuelo?.created_at },
    { etiqueta: "Post-vuelo editado por", nombre: pvData?.postVuelo?.editado_por_nombre, fecha: pvData?.postVuelo?.updated_at },
  ]

  useEffect(() => {
    if (!relevantePostVuelo) return
    fetch(`/api/escalas/${e.id}/post-vuelo`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(setPvData)
      .catch(() => setPvData(null))
  }, [e.id, relevantePostVuelo])

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {pendiente && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs font-medium">
          ⏳ Todavía no fue autorizada — está esperando que la revise el autorizante activo.
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {e.aeronave?.matricula || "Sin aeronave"} · {ruta} · {ETIQUETAS_ESTADO[estadoVisual] || estadoVisual}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Escala #{e.id}{e.nro_orden && ` · Orden #${e.nro_orden}`}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {formatearRangoVuelo(e.hora_despegue_estimada, e.hora_arribo_estimada)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Tripulación:{" "}
            {(e.tripulacion || []).length > 0
              ? e.tripulacion.map((t, i) => (
                  <span key={i}>
                    {t.persona.grado} {t.persona.apellido}
                    {" "}({t.rol_en_vuelo ? t.rol_en_vuelo.replace(/_/g, " ").toLowerCase() : "rol sin especificar"})
                    {i < e.tripulacion.length - 1 ? ", " : ""}
                  </span>
                ))
              : "Sin tripulación cargada"}
          </p>
          {e.tipo_mision && (
            <p className="text-xs text-gray-500 mt-1">
              Tipo de misión: {e.tipo_mision.codigo} · Solicitante: {e.solicitante}
            </p>
          )}
          {e.estado === "ABORTADA" && e.motivo_abortada && (
            <p className="text-xs text-red-600 mt-1">
              Motivo del aborto: {ETIQUETAS_MOTIVO_ABORTO[e.motivo_abortada] || e.motivo_abortada}
              {e.observacion_aborto && ` — ${e.observacion_aborto}`}
            </p>
          )}
       </div>
        <button onClick={onCerrar} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">
          ✕ cerrar
        </button>
      </div>

      {!acuseCargando && acuse && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {acuseError && (
            <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">{acuseError}</div>
          )}
          {!acuse.fecha_acuse ? (
            <div className="flex items-center justify-between gap-3 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-xs text-purple-800">
                Te falta acusar recibo de esta escala (como {ETIQUETAS_ROL_ACUSE[acuse.rol] || acuse.rol}).
              </p>
              <button
                onClick={handleAcusarRecibo}
                disabled={acuseGuardando}
                className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-md font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 shrink-0"
              >
                {acuseGuardando ? "..." : "Acusar recibo"}
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-400">
              ✓ Acusaste recibo el {formatearFechaHora(acuse.fecha_acuse, { year: undefined, second: undefined })}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <SeparadorSeccion texto="Auditoría" />
        <div className="mt-3">
          <PanelAuditoria items={itemsAuditoria} />
        </div>
      </div>
    </div>
  )
}