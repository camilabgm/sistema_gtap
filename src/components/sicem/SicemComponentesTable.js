"use client"

// src/components/sicem/SicemComponentesTable.js
//
// Solo vista de tarjetas "Por aeronave" — con máximo 3 componentes por
// aeronave alcanza y es más clara que una tabla. La fila de acciones de
// cada tarjeta tiene flex-wrap.
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina. Antes
//     "Nuevo componente" se salía de la tarjeta en celular y también
//     en 1200px. No usa volverAInicio: en celular, SubNavSicem ya trae
//     el "Volver".
//   - Grilla de tarjetas: 1 columna en celular, 2 desde 640px y 3 desde
//     1024px. Antes saltaba directo a 3 columnas en 640px, y en tablet
//     cada tarjeta quedaba tan angosta que sus botones se salían.

import { useState } from "react"
import { Plus, Pencil, Trash2, RotateCcw, PowerOff } from "lucide-react"
import SicemComponentesForm from "./SicemComponentesForm"
import SicemDatosGeneralesAeronave from "./SicemDatosGeneralesAeronave"
import AccionIcono from "@/components/shared/AccionIcono"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"

const ETIQUETAS_TIPO = {
  MOTOR: "Motor",
  HELICE: "Hélice",
  APU: "APU",
}

function formatearMinutos(min) {
  if (min === null || min === undefined) return "—"
  const negativo = min < 0
  const abs = Math.abs(min)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${negativo ? "-" : ""}${h}h ${m}min`
}

function formatearFecha(fecha) {
  if (!fecha) return "—"
  return new Date(fecha).toLocaleDateString("es-PY", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" })
}

// Colores de la barra y del texto grande — mismo criterio que el
// badge de la tarjeta.
function estadoComponente(c) {
  if (c.umbral_horas_minutos == null) return { color: "gray", barra: "bg-gray-300", texto: "text-gray-400" }
  if (c.horas_disponibles_minutos < 0) return { color: "red", barra: "bg-red-500", texto: "text-red-700" }
  if (c.necesita_alerta) return { color: "amber", barra: "bg-amber-500", texto: "text-amber-700" }
  return { color: "green", barra: "bg-green-500", texto: "text-green-700" }
}

function badgeAlerta(componente) {
  if (componente.umbral_horas_minutos == null) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Sin umbral cargado</span>
  }
  if (componente.horas_disponibles_minutos < 0) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">✗ Umbral superado</span>
  }
  if (componente.necesita_alerta) {
    return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">⚠ Por vencer</span>
  }
  return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">✓ OK</span>
}

export default function SicemComponentesTable({ componentes: datosIniciales, aeronaves: aeronavesIniciales, permisos }) {

  const [componentes, setComponentes] = useState(datosIniciales)
  const [aeronaves, setAeronaves] = useState(aeronavesIniciales)
  const [aeronaveElegidaId, setAeronaveElegidaId] = useState(aeronavesIniciales[0]?.id ?? null)
  const [filtroTipo, setFiltroTipo] = useState("TODOS")
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [componenteSeleccionado, setComponenteSeleccionado] = useState(null)
  const [cambiandoEstado, setCambiandoEstado] = useState(null)

  const aeronaveElegida = aeronaves.find((a) => a.id === aeronaveElegidaId)

  const componentesDeAeronave = componentes.filter((c) => {
    const pasaAeronave = c.aeronave_id === aeronaveElegidaId
    const pasaTipo = filtroTipo === "TODOS" || c.tipo === filtroTipo
    const pasaActivo = mostrarInactivos || c.activo !== false
    return pasaAeronave && pasaTipo && pasaActivo
  })

  function handleNuevo() { setComponenteSeleccionado(null); setModalAbierto(true) }
  function handleEditar(c) { setComponenteSeleccionado(c); setModalAbierto(true) }
  function handleCerrar() { setModalAbierto(false); setComponenteSeleccionado(null) }

  async function recargarDatos(incluirInactivos = mostrarInactivos) {
    const url = incluirInactivos ? "/api/sicem/componentes?incluirInactivos=true" : "/api/sicem/componentes"
    const res = await fetch(url, { credentials: "include" })
    setComponentes(await res.json())
  }

  function toggleMostrarInactivos() {
    setMostrarInactivos((prev) => {
      const nuevoValor = !prev
      recargarDatos(nuevoValor)
      return nuevoValor
    })
  }

  async function handleGuardado() { handleCerrar(); await recargarDatos() }

  function handleGuardadoDatosGenerales(aeronaveActualizada) {
    setAeronaves((prev) => prev.map((a) => (a.id === aeronaveActualizada.id ? aeronaveActualizada : a)))
  }

  async function handleDesactivar(componente) {
    if (!window.confirm(`¿Desactivar el ${ETIQUETAS_TIPO[componente.tipo]} de ${componente.aeronave.matricula}? No se borra — queda oculto y sin contar para las alertas hasta que lo reactivés. No se puede eliminar de verdad porque ya tiene historial o eventos registrados.`)) return
    setCambiandoEstado(componente.id)
    await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: false }),
    })
    await recargarDatos()
    setCambiandoEstado(null)
  }

  async function handleEliminar(componente) {
    if (!window.confirm(`¿Eliminar el ${ETIQUETAS_TIPO[componente.tipo]} de ${componente.aeronave.matricula}? Esto SÍ borra el registro para siempre — no se puede deshacer. Como todavía no tiene ningún evento de mantenimiento real, no hay nada operacional que se pierda (si tenía correcciones manuales en su historial, se borran junto con él).`)) return
    setCambiandoEstado(componente.id)
    const res = await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) {
      const datos = await res.json()
      alert(datos.error || "Error al eliminar")
    }
    await recargarDatos()
    setCambiandoEstado(null)
  }

  async function handleReactivar(componente) {
    setCambiandoEstado(componente.id)
    await fetch(`/api/sicem/componentes/${componente.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: true }),
    })
    await recargarDatos()
    setCambiandoEstado(null)
  }

  return (
    <div className="p-4">

      <EncabezadoPagina
        titulo="Componentes de mantenimiento"
        subtitulo="Umbrales y horas acumuladas por motor, hélice y APU de cada aeronave"
        acciones={permisos?.puede_crear && (
          <button onClick={handleNuevo}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9">
            <Plus className="h-4 w-4" />
            Nuevo componente
          </button>
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <select value={aeronaveElegidaId ?? ""}
            onChange={(e) => setAeronaveElegidaId(Number(e.target.value))}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {aeronaves.map((a) => (
              <option key={a.id} value={a.id}>{a.matricula}</option>
            ))}
          </select>

          <select value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="TODOS">Todos los tipos</option>
            <option value="MOTOR">Motor</option>
            <option value="HELICE">Hélice</option>
            <option value="APU">APU</option>
          </select>

          <div className="hidden md:block w-px h-7 bg-gray-200" />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={mostrarInactivos} onChange={toggleMostrarInactivos}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Mostrar inactivos
          </label>
        </div>
      </EncabezadoPagina>

      {aeronaveElegida && (
        <SicemDatosGeneralesAeronave key={aeronaveElegida.id} aeronave={aeronaveElegida} onGuardado={handleGuardadoDatosGenerales} permisos={permisos} />
      )}

      {componentesDeAeronave.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          {filtroTipo === "TODOS"
            ? "Esta aeronave todavía no tiene componentes configurados."
            : `Esta aeronave no tiene un componente ${ETIQUETAS_TIPO[filtroTipo]} configurado.`}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {componentesDeAeronave.map((c) => {
            const estado = estadoComponente(c)
            const pct = c.umbral_horas_minutos
              ? Math.min(100, Math.max(0, (c.horas_acumuladas_minutos / c.umbral_horas_minutos) * 100))
              : 0
            return (
              <div key={c.id} className={`bg-white rounded-lg border border-gray-200 p-5 ${c.activo === false ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-sm font-semibold text-gray-900">{ETIQUETAS_TIPO[c.tipo] || c.tipo}</span>
                  {badgeAlerta(c)}
                </div>

                <p className={`text-3xl font-bold ${estado.texto}`}>{formatearMinutos(c.horas_disponibles_minutos)}</p>
                <p className="text-xs text-gray-400 mb-3">disponibles</p>

                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full ${estado.barra}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="text-xs text-gray-500 space-y-1 mb-3">
                  <p>Acumuladas: {formatearMinutos(c.horas_acumuladas_minutos)}</p>
                  <p>Umbral: {formatearMinutos(c.umbral_horas_minutos)}</p>
                  {c.fecha_proxima_inspeccion && <p>Próx. inspección: {formatearFecha(c.fecha_proxima_inspeccion)}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-3 border-t border-gray-100">
                  {c.activo === false ? (
                    permisos?.puede_editar && (
                      <AccionIcono icono={RotateCcw} etiqueta="Reactivar" onClick={() => handleReactivar(c)} disabled={cambiandoEstado === c.id} color="primario" />
                    )
                  ) : (
                    <>
                      {permisos?.puede_editar && (
                        <AccionIcono icono={Pencil} etiqueta="Editar" onClick={() => handleEditar(c)} color="primario" />
                      )}
                      {c.puede_eliminarse ? (
                        permisos?.puede_eliminar && (
                          <AccionIcono icono={Trash2} etiqueta="Eliminar" onClick={() => handleEliminar(c)} disabled={cambiandoEstado === c.id} color="peligro" />
                        )
                      ) : (
                        permisos?.puede_editar && (
                          <AccionIcono icono={PowerOff} etiqueta="Desactivar" onClick={() => handleDesactivar(c)} disabled={cambiandoEstado === c.id} />
                        )
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAbierto && (
        <SicemComponentesForm
          componente={componenteSeleccionado}
          aeronaves={aeronaves}
          onGuardado={handleGuardado}
          onCerrar={handleCerrar}
        />
      )}
    </div>
  )
}