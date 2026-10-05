"use client"

// src/components/informes/InformeTotales.js
//
// Totales agregados: por tripulante, por aeronave, por tipo de misión
// (combustible), y por institución solicitante. Mismo filtro de fecha
// para las 4. Cada pestaña tiene su propio selector "Todos / específico";
// las opciones específicas se arman a partir de lo que trajo la búsqueda.
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina (solo
//     subtítulo: el título "Informes" ya está arriba de las pestañas).
//     Antes "Exportar PDF" se salía de la tarjeta en un celular angosto.
//   - Las 4 pestañas no entran en un celular: ahora la fila de
//     pestañas se desliza de costado (overflow-x-auto), cada pestaña en
//     una sola línea — el mismo patrón que usan las apps de celular
//     para muchas pestañas. Antes empujaban la página entera.
//   - La tabla pasa de overflow-hidden a overflow-x-auto.

import { useState, useEffect, useCallback } from "react"
import { Download } from "lucide-react"
import { exportarInformeTotalesPDF } from "@/lib/exportarInformeTotalesPDF"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"

function primerDiaDelMes() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
}
function formatearISO(fecha) {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, "0")
  const d = String(fecha.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
function formatearHoras(minutos) {
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${h}h ${m}min`
}

const PESTANAS = [
  { key: "por_tripulante", label: "Por tripulante" },
  { key: "por_aeronave", label: "Por aeronave" },
  { key: "por_tipo_mision", label: "Combustible por tipo de misión" },
  { key: "por_solicitante", label: "Por institución solicitante" },
]

const ROLES_TRIPULANTE = [
  { value: "PILOTO", label: "Piloto" },
  { value: "COPILOTO", label: "Copiloto" },
  { value: "TECNICO_DE_VUELO", label: "Técnico de vuelo" },
]

// Cuando se elige "Todos los roles", vuelve a sumar en una sola fila
// por persona lo que la API trae desglosado por persona+rol.
function agregarTodosLosRoles(filasPorRol) {
  const mapa = new Map()
  filasPorRol.forEach((f) => {
    if (!mapa.has(f.nombre)) mapa.set(f.nombre, { nombre: f.nombre, vuelos: 0, minutos: 0 })
    const entry = mapa.get(f.nombre)
    entry.vuelos += f.vuelos
    entry.minutos += f.minutos
  })
  return [...mapa.values()]
    .map((e) => ({ ...e, horas_texto: formatearHoras(e.minutos) }))
    .sort((a, b) => b.minutos - a.minutos)
}

export default function InformeTotales() {
  const [desde, setDesde] = useState(formatearISO(primerDiaDelMes()))
  const [hasta, setHasta] = useState(formatearISO(new Date()))
  const [pestana, setPestana] = useState("por_tripulante")
  const [filtroTripulante, setFiltroTripulante] = useState("TODOS")
  const [filtroAeronave, setFiltroAeronave] = useState("TODOS")
  const [filtroTipoMision, setFiltroTipoMision] = useState("TODOS")
  const [filtroSolicitante, setFiltroSolicitante] = useState("TODOS")
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const buscar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch(`/api/informes/totales?desde=${desde}&hasta=${hasta}`, { credentials: "include" })
      const data = await res.json()
      if (res.ok) {
        setDatos(data)
        // Al traer datos nuevos, los selectores de específico vuelven a
        // "Todos" — la opción puntual anterior puede ya no existir.
        setFiltroAeronave("TODOS")
        setFiltroTipoMision("TODOS")
        setFiltroSolicitante("TODOS")
      } else {
        setError(data.error || "Error al cargar")
      }
    } catch {
      setError("Error al cargar")
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => { buscar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const porTripulanteCrudo = datos?.por_tripulante || []
  const porAeronaveCrudo = datos?.por_aeronave || []
  const porTipoMisionCrudo = datos?.por_tipo_mision || []
  const porSolicitanteCrudo = datos?.por_solicitante || []

  const opcionesAeronave = porAeronaveCrudo.map((f) => f.matricula)
  const opcionesTipoMision = porTipoMisionCrudo.map((f) => f.nombre)
  const opcionesSolicitante = porSolicitanteCrudo.map((f) => f.nombre)

  let filas = []
  if (pestana === "por_tripulante") {
    filas = filtroTripulante === "TODOS"
      ? agregarTodosLosRoles(porTripulanteCrudo)
      : porTripulanteCrudo.filter((f) => f.rol === filtroTripulante)
  } else if (pestana === "por_aeronave") {
    filas = filtroAeronave === "TODOS"
      ? porAeronaveCrudo
      : porAeronaveCrudo.filter((f) => f.matricula === filtroAeronave)
  } else if (pestana === "por_tipo_mision") {
    filas = filtroTipoMision === "TODOS"
      ? porTipoMisionCrudo
      : porTipoMisionCrudo.filter((f) => f.nombre === filtroTipoMision)
  } else {
    filas = filtroSolicitante === "TODOS"
      ? porSolicitanteCrudo
      : porSolicitanteCrudo.filter((f) => f.nombre === filtroSolicitante)
  }

  function handleExportarPDF() {
    let filtroTexto = ""
    if (pestana === "por_tripulante" && filtroTripulante !== "TODOS") {
      filtroTexto = `Rol: ${ROLES_TRIPULANTE.find((r) => r.value === filtroTripulante)?.label}`
    } else if (pestana === "por_aeronave" && filtroAeronave !== "TODOS") {
      filtroTexto = `Aeronave: ${filtroAeronave}`
    } else if (pestana === "por_tipo_mision" && filtroTipoMision !== "TODOS") {
      filtroTexto = `Tipo de misión: ${filtroTipoMision}`
    } else if (pestana === "por_solicitante" && filtroSolicitante !== "TODOS") {
      filtroTexto = `Institución: ${filtroSolicitante}`
    }
    exportarInformeTotalesPDF(filas, { pestana, desde, hasta, filtroTexto })
  }

  return (
    <div>
      <EncabezadoPagina
        subtitulo="Totales agregados por tripulante, aeronave, combustible por tipo de misión e institución solicitante"
        acciones={
          <button
            onClick={handleExportarPDF}
            disabled={filas.length === 0}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3.5 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors h-9 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Exportar PDF
          </button>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm" />
          </div>
          <button onClick={buscar} disabled={cargando}
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {cargando ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {/* Pestañas: si no entran las 4, la fila se desliza de costado
            DENTRO de la tarjeta (overflow-x-auto) — cada pestaña queda
            en una sola línea (whitespace-nowrap) y no se achica. */}
        <div className="flex gap-1 mt-4 border-b border-gray-200 overflow-x-auto">
          {PESTANAS.map((p) => (
            <button key={p.key} onClick={() => setPestana(p.key)}
              className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                pestana === p.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {pestana === "por_tripulante" && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Rol</label>
            <select value={filtroTripulante} onChange={(e) => setFiltroTripulante(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              <option value="TODOS">Todos los roles</option>
              {ROLES_TRIPULANTE.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        )}

        {pestana === "por_aeronave" && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Aeronave</label>
            <select value={filtroAeronave} onChange={(e) => setFiltroAeronave(e.target.value)}
              className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              <option value="TODOS">Todas</option>
              {opcionesAeronave.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {pestana === "por_tipo_mision" && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de misión</label>
            <select value={filtroTipoMision} onChange={(e) => setFiltroTipoMision(e.target.value)}
              className="max-w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              <option value="TODOS">Todos</option>
              {opcionesTipoMision.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}

        {pestana === "por_solicitante" && (
          <div className="mt-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Institución solicitante</label>
            <select value={filtroSolicitante} onChange={(e) => setFiltroSolicitante(e.target.value)}
              className="max-w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              <option value="TODOS">Todas</option>
              {opcionesSolicitante.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </EncabezadoPagina>

      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : cargando ? (
        <p className="text-sm text-gray-400">Cargando...</p>
      ) : filas.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
          {pestana === "por_tripulante" && filtroTripulante !== "TODOS"
            ? `Nadie voló como ${ROLES_TRIPULANTE.find((r) => r.value === filtroTripulante)?.label.toLowerCase()} en este período.`
            : "Sin datos para este período."}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {pestana === "por_tripulante"
                    ? "Tripulante"
                    : pestana === "por_aeronave"
                    ? "Aeronave"
                    : pestana === "por_tipo_mision"
                    ? "Tipo de misión"
                    : "Institución solicitante"}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Vuelos</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {pestana === "por_tipo_mision" ? "Combustible" : "Horas de vuelo"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filas.map((f, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {f.nombre ?? f.matricula}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right">{f.vuelos}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 text-right whitespace-nowrap">
                    {pestana === "por_tipo_mision" ? `${f.litros} L` : f.horas_texto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}