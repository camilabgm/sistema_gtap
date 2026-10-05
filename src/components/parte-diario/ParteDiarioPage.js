"use client"
// src/components/parte-diario/ParteDiarioPage.js
//
// Las filas de novedades/personal se apilan en pantallas muy
// angostas; la fila de acciones de cada novedad tiene flex-wrap.
//
// CAMBIO (rama fix/responsive-listados):
//   - Encabezado con el componente compartido EncabezadoPagina (incluye
//     el "Volver a Inicio" de celular). Antes "Agregar novedad" se
//     salía de la tarjeta en un celular angosto.
//   - Los tres contadores (Total / Disponibles / Con novedad) usan
//     gap-4 en celular (gap-8 desde 640px), así entran en 320px.
//
// CAMBIO (rama fix/responsive-maestro-detalle): la fecha de hoy del
// encabezado se calcula con timeZone "America/Asuncion" explícito.
//
// CAMBIO (rama fix/responsive-modales): el modal de agregar/editar
// novedad usa la cáscara compartida ModalBase (pantalla completa en
// celular, botones siempre visibles, Esc para cerrar, tocar afuera no
// cierra). La lista de resultados del buscador de personas pasa de
// flotante a estar en el flujo normal, para que no la recorte el
// contenido con scroll del modal.

import { useState } from "react"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import AccionIcono from "@/components/shared/AccionIcono"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"
import ModalBase from "@/components/shared/ModalBase"
import { normalizarParaBusqueda as normalizarTexto } from "@/lib/texto"

const ETIQUETAS_ESCUADRON = {
  ESCUADRON_OPERACIONES_AEREAS: "Esc. Operaciones",
  ESCUADRON_MANTENIMIENTO:      "Esc. Mantenimiento",
  ESCUADRON_BASE:               "Esc. Base",
  PLANA_MAYOR:                  "Plana Mayor",
}

function nombreCompleto(p) {
  return `${p.grado} ${p.apellido}, ${p.nombre}`
}

export default function ParteDiarioPage({ novedadesIniciales, personas, permisos }) {

  const [novedades,       setNovedades]       = useState(novedadesIniciales)
  const [modalAbierto,    setModalAbierto]    = useState(false)
  const [novedadEditando, setNovedadEditando] = useState(null)
  const [personaId,       setPersonaId]       = useState("")
  const [textoPersona,    setTextoPersona]    = useState("")   // lo que se ve escrito en el input
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const [observacion,     setObservacion]     = useState("")
  const [cargando,        setCargando]        = useState(false)
  const [error,           setError]           = useState("")
  const [quitando,        setQuitando]        = useState(null)

  const idsConNovedad        = new Set(novedades.map((n) => n.persona_id))
  const personasDisponibles  = personas.filter((p) => !idsConNovedad.has(p.id))
  const personasParaSelector = personas.filter((p) => !idsConNovedad.has(p.id))

  const personasFiltradas = personasParaSelector.filter((p) => {
    const texto = normalizarTexto(textoPersona)
    return (
      textoPersona === "" ||
      normalizarTexto(p.nombre).includes(texto) ||
      normalizarTexto(p.apellido).includes(texto)
    )
  })

  // timeZone explícito: este componente se dibuja primero en el
  // servidor. Sin esto, con el servidor en UTC, entre las 21:00 y las
  // 23:59 de Paraguay el servidor ya diría "mañana" y el navegador
  // "hoy" — fecha equivocada y error de hidratación.
  const fechaHoy = new Date().toLocaleDateString("es-PY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "America/Asuncion",
  })

  function handleAbrirCrear() {
    setNovedadEditando(null)
    setPersonaId("")
    setTextoPersona("")
    setObservacion("")
    setError("")
    setModalAbierto(true)
  }

  function handleAbrirEditar(novedad) {
    setNovedadEditando(novedad)
    setPersonaId(novedad.persona_id)
    setObservacion(novedad.observacion || "")
    setError("")
    setModalAbierto(true)
  }

  function handleCerrarModal() {
    setModalAbierto(false)
    setDropdownAbierto(false)
  }

  function handleSeleccionarPersona(p) {
    setPersonaId(p.id)
    setTextoPersona(nombreCompleto(p))
    setDropdownAbierto(false)
  }

  function handleCambiarTexto(valor) {
    setTextoPersona(valor)
    setPersonaId("")       // si sigue escribiendo, la selección anterior queda sin efecto
    setDropdownAbierto(true)
  }

  async function handleGuardar() {
    if (!novedadEditando && !personaId) { setError("Seleccioná una persona de la lista"); return }
    setCargando(true)
    setError("")

    const esEdicion = !!novedadEditando

    const res = await fetch("/api/parte-diario", {
      method:  esEdicion ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(
        esEdicion
          ? { novedadId: novedadEditando.id, observacion }
          : { persona_id: personaId, observacion }
      ),
    })

    const datos = await res.json()

    if (!res.ok) {
      setError(datos.error || "Error al guardar")
      setCargando(false)
      return
    }

    await recargarNovedades()
    handleCerrarModal()
    setCargando(false)
  }

  async function handleQuitarNovedad(novedadId) {
    setQuitando(novedadId)
    await fetch(`/api/parte-diario?novedadId=${novedadId}`, { method: "DELETE" })
    await recargarNovedades()
    setQuitando(null)
  }

  async function recargarNovedades() {
    const res   = await fetch("/api/parte-diario")
    const datos = await res.json()
    setNovedades(datos.novedades)
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <EncabezadoPagina
        volverAInicio
        titulo="Parte de Novedades"
        subtitulo={<span className="capitalize">{fechaHoy}</span>}
        acciones={permisos?.puede_crear && (
          <button
            onClick={handleAbrirCrear}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors h-9"
          >
            <Plus className="h-4 w-4" />
            Agregar novedad
          </button>
        )}
      >
        <div className="flex items-center justify-center gap-4 sm:gap-8 pb-1">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{personas.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total personal</p>
          </div>
          <div className="w-px h-9 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700">{personasDisponibles.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Disponibles hoy</p>
          </div>
          <div className="w-px h-9 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-red-700">{novedades.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Con novedad</p>
          </div>
        </div>
      </EncabezadoPagina>

      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Novedades registradas hoy
        </h2>
        {novedades.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-400 text-sm">
            Sin novedades. Todo el personal se considera disponible.
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {novedades.map((nov) => (
              <div key={nov.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {nov.persona.grado} {nov.persona.apellido}, {nov.persona.nombre}
                  </p>
                  {nov.observacion && (
                    <p className="text-xs text-gray-500 mt-0.5">{nov.observacion}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium mr-2">
                    No disponible
                  </span>
                  {permisos?.puede_editar && (
                    <AccionIcono
                      icono={Pencil}
                      etiqueta="Editar novedad"
                      onClick={() => handleAbrirEditar(nov)}
                      color="primario"
                    />
                  )}
                  {permisos?.puede_eliminar && (
                    <AccionIcono
                      icono={Trash2}
                      etiqueta="Quitar novedad"
                      onClick={() => handleQuitarNovedad(nov.id)}
                      disabled={quitando === nov.id}
                      color="peligro"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Personal disponible hoy
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {personasDisponibles.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Sin personal disponible.</p>
          ) : (
            personasDisponibles.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {p.grado} {p.apellido}, {p.nombre}
                  </p>
                  <p className="text-xs text-gray-400">
                    {ETIQUETAS_ESCUADRON[p.escuadron] || p.escuadron}
                  </p>
                </div>
                <span className="self-start px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium sm:self-auto">
                  Disponible
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {modalAbierto && (
        <ModalBase
          titulo={novedadEditando ? "Editar novedad" : "Agregar novedad"}
          onCerrar={handleCerrarModal}
          ancho="md"
          error={error}
          pie={<>
            <button onClick={handleCerrarModal}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={cargando}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {cargando ? "Guardando..." : "Guardar novedad"}
            </button>
          </>}
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Persona <span className="text-red-500">*</span>
            </label>
            {novedadEditando ? (
              <p className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700">
                {novedadEditando.persona.grado} {novedadEditando.persona.apellido}, {novedadEditando.persona.nombre}
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={textoPersona}
                    onChange={(e) => handleCambiarTexto(e.target.value)}
                    onFocus={() => setDropdownAbierto(true)}
                    placeholder="Buscar persona por nombre o apellido..."
                    className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* La lista de resultados va en el flujo normal (no
                    flotando con absolute): dentro de un modal con
                    scroll, una lista flotante queda recortada por el
                    borde del contenido. Así empuja hacia abajo lo que
                    sigue y siempre se ve completa. */}
                {dropdownAbierto && (
                  <div className="mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-48 overflow-y-auto">
                    {personasFiltradas.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados</p>
                    ) : (
                      personasFiltradas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseDown={() => handleSeleccionarPersona(p)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          {nombreCompleto(p)}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observación <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input type="text" value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: permiso médico, comisión IBA..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </ModalBase>
      )}

    </div>
  )
}