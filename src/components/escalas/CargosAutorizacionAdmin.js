"use client"

// Pantalla de administración de los 5 cargos de la cascada de
// autorización de Escalas. El Comandante NUNCA tiene adjunto en la vida
// real — no existe ese puesto en la cadena de mando — así que esa fila
// se oculta directamente para ese cargo en particular.

import { useState, useEffect } from "react"
import { Search } from "lucide-react"

const CASCADA_ORDEN = [
  "COMANDANTE",
  "JEFE_OPERACIONES",
  "CMDTE_ESC_AEREO",
  "CMDTE_ESC_MANTENIMIENTO",
  "JEFE_PERSONAL",
]

export default function CargosAutorizacionAdmin() {
  const [cargos, setCargos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [errorGeneral, setErrorGeneral] = useState(null)

  const [slotAbierto, setSlotAbierto] = useState(null)
  const [candidatos, setCandidatos] = useState([])
  const [cargandoCandidatos, setCargandoCandidatos] = useState(false)

  const [slotGuardando, setSlotGuardando] = useState(null)
  const [slotError, setSlotError] = useState(null)
  const [slotGuardado, setSlotGuardado] = useState(null)

  useEffect(() => {
    cargarCargos()
  }, [])

  async function cargarCargos() {
    setCargando(true)
    setErrorGeneral(null)
    try {
      const res = await fetch("/api/escalas/cargos-autorizacion", { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al cargar los cargos")

      const ordenados = CASCADA_ORDEN.map((rol) => data.find((c) => c.rol_autorizador === rol)).filter(Boolean)
      setCargos(ordenados)
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setCargando(false)
    }
  }

  async function abrirSlot(rolAutorizador, orden) {
    if (slotAbierto?.rol_autorizador === rolAutorizador && slotAbierto?.orden === orden) {
      setSlotAbierto(null)
      return
    }

    setSlotAbierto({ rol_autorizador: rolAutorizador, orden })
    setSlotError(null)
    setCandidatos([])
    setCargandoCandidatos(true)
    try {
      const res = await fetch(
        `/api/escalas/cargos-autorizacion/candidatos?rol_autorizador=${rolAutorizador}&orden=${orden}`,
        { credentials: "include" }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al buscar candidatos")
      setCandidatos(data)
    } catch (err) {
      setSlotError({ rol_autorizador: rolAutorizador, orden, mensaje: err.message })
    } finally {
      setCargandoCandidatos(false)
    }
  }

  async function elegirCandidato(rolAutorizador, orden, usuarioId) {
    setSlotGuardando({ rol_autorizador: rolAutorizador, orden })
    setSlotError(null)
    try {
      const res = await fetch("/api/escalas/cargos-autorizacion", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol_autorizador: rolAutorizador, orden, usuario_id: usuarioId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")

      const candidato = candidatos.find((c) => c.id === usuarioId)
      const nombre = candidato
        ? `${candidato.persona.grado} ${candidato.persona.nombre} ${candidato.persona.apellido}`
        : "—"

      setCargos((prev) =>
        prev.map((cargo) =>
          cargo.rol_autorizador === rolAutorizador
            ? { ...cargo, [orden === 1 ? "titular" : "adjunto"]: { usuario_id: usuarioId, nombre } }
            : cargo
        )
      )

      setSlotAbierto(null)
      setSlotGuardado({ rol_autorizador: rolAutorizador, orden })
      setTimeout(() => setSlotGuardado(null), 3000)
    } catch (err) {
      setSlotError({ rol_autorizador: rolAutorizador, orden, mensaje: err.message })
    } finally {
      setSlotGuardando(null)
    }
  }

  if (cargando) {
    return <div className="p-4 max-w-4xl mx-auto text-sm text-gray-400">Cargando cargos de autorización...</div>
  }
  if (errorGeneral) {
    return <div className="p-4 max-w-4xl mx-auto text-sm text-red-600">{errorGeneral}</div>
  }

  // El Comandante solo necesita titular para considerarse "completo" —
  // nunca va a tener adjunto, así que no se lo exige como al resto.
  const completos = cargos.filter((c) =>
    c.rol_autorizador === "COMANDANTE" ? !!c.titular : (c.titular && c.adjunto)
  ).length
  const conVacantes = cargos.length - completos

  return (
    <div className="p-4 max-w-4xl mx-auto">

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Cargos de Autorización</h1>
        <p className="text-sm text-gray-500 mt-1">
          Titular y adjunto de cada cargo en la cascada de autorización de escalas
        </p>

        <div className="flex items-center justify-center gap-8 pt-4 mt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700">{completos}</p>
            <p className="text-xs text-gray-500 mt-0.5">Cargos completos</p>
          </div>
          <div className="w-px h-9 bg-gray-200" />
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-700">{conVacantes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Con alguna vacante</p>
          </div>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Cargos de la cascada
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        {cargos.map((cargo) => {
          const esComandante = cargo.rol_autorizador === "COMANDANTE"
          return (
            <div key={cargo.rol_autorizador}>
              <div className="px-5 py-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900">{cargo.nombre_rol}</p>
              </div>

              <div className="divide-y divide-gray-100">
                <FilaPosicion
                  etiqueta="Titular"
                  orden={1}
                  persona={cargo.titular}
                  estaAbierto={slotAbierto?.rol_autorizador === cargo.rol_autorizador && slotAbierto?.orden === 1}
                  estaGuardando={slotGuardando?.rol_autorizador === cargo.rol_autorizador && slotGuardando?.orden === 1}
                  estaGuardado={slotGuardado?.rol_autorizador === cargo.rol_autorizador && slotGuardado?.orden === 1}
                  error={slotError?.rol_autorizador === cargo.rol_autorizador && slotError?.orden === 1 ? slotError.mensaje : null}
                  candidatos={slotAbierto?.rol_autorizador === cargo.rol_autorizador && slotAbierto?.orden === 1 ? candidatos : []}
                  cargandoCandidatos={cargandoCandidatos}
                  onAbrir={() => abrirSlot(cargo.rol_autorizador, 1)}
                  onElegir={(usuarioId) => elegirCandidato(cargo.rol_autorizador, 1, usuarioId)}
                />
                {!esComandante && (
                  <FilaPosicion
                    etiqueta="Adjunto"
                    orden={2}
                    persona={cargo.adjunto}
                    estaAbierto={slotAbierto?.rol_autorizador === cargo.rol_autorizador && slotAbierto?.orden === 2}
                    estaGuardando={slotGuardando?.rol_autorizador === cargo.rol_autorizador && slotGuardando?.orden === 2}
                    estaGuardado={slotGuardado?.rol_autorizador === cargo.rol_autorizador && slotGuardado?.orden === 2}
                    error={slotError?.rol_autorizador === cargo.rol_autorizador && slotError?.orden === 2 ? slotError.mensaje : null}
                    candidatos={slotAbierto?.rol_autorizador === cargo.rol_autorizador && slotAbierto?.orden === 2 ? candidatos : []}
                    cargandoCandidatos={cargandoCandidatos}
                    onAbrir={() => abrirSlot(cargo.rol_autorizador, 2)}
                    onElegir={(usuarioId) => elegirCandidato(cargo.rol_autorizador, 2, usuarioId)}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FilaPosicion({
  etiqueta, orden, persona, estaAbierto, estaGuardando, estaGuardado,
  error, candidatos, cargandoCandidatos, onAbrir, onElegir,
}) {
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    if (!estaAbierto) setBusqueda("")
  }, [estaAbierto])

  const candidatosFiltrados = candidatos.filter((c) => {
    const texto = `${c.persona.grado} ${c.persona.nombre} ${c.persona.apellido}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  return (
    <div className="px-5 py-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{etiqueta}</p>
          <p className="text-sm font-medium text-gray-900">
            {persona ? persona.nombre : "—"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {estaGuardado && (
            <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
              Guardado
            </span>
          )}
          <span
            className={`px-2 py-1 text-xs rounded-full font-medium ${
              persona ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {persona ? "Asignado" : "Sin asignar"}
          </span>
          <button
            onClick={onAbrir}
            disabled={estaGuardando}
            className="h-8 px-3 rounded-md border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {estaGuardando ? "..." : persona ? "Cambiar" : "Asignar"}
          </button>
        </div>
      </div>

      {estaAbierto && (
        <div className="mt-3 bg-gray-50 rounded-md border border-gray-200 p-3">
          {cargandoCandidatos ? (
            <p className="text-sm text-gray-400">Buscando candidatos...</p>
          ) : candidatos.length === 0 ? (
            <p className="text-sm text-gray-400">
              {orden === 1
                ? "No hay ningún usuario con este Rol asignado todavía."
                : "No hay usuarios activos disponibles."}
            </p>
          ) : (
            <>
              {candidatos.length > 1 && (
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, apellido o grado"
                    autoFocus
                    className="w-full h-9 pl-8 pr-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {candidatosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-400 px-1">
                  Ningún usuario coincide con &quot;{busqueda}&quot;.
                </p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto">
                  {candidatosFiltrados.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => onElegir(c.id)}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-900 bg-white border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                      >
                        {c.persona.grado} {c.persona.nombre} {c.persona.apellido}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-md text-xs">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}