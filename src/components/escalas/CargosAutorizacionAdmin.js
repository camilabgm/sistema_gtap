"use client"

// Pantalla de administración de los 5 cargos de la cascada de
// autorización de Escalas. Cada cargo muestra su titular y adjunto
// actuales, con un desplegable inline (no modal) para reasignar,
// filtrado por Rol correspondiente desde el backend.

import { useState, useEffect } from "react"

// Orden de la cascada, para mostrar las filas en el orden en que el
// sistema realmente las recorre al autorizar.
const CASCADA_ORDEN = [
  "JEFE_OPERACIONES",
  "COMANDANTE",
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
        `/api/escalas/cargos-autorizacion/candidatos?rol_autorizador=${rolAutorizador}`,
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
    return <div className="p-8 max-w-4xl mx-auto text-sm text-gray-400">Cargando cargos de autorización...</div>
  }
  if (errorGeneral) {
    return <div className="p-8 max-w-4xl mx-auto text-sm text-red-600">{errorGeneral}</div>
  }

  const completos = cargos.filter((c) => c.titular && c.adjunto).length
  const conVacantes = cargos.length - completos

  return (
    <div className="p-8 max-w-4xl mx-auto">

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Cargos de Autorización</h1>
        <p className="text-sm text-gray-500 mt-1">
          Titular y adjunto de cada cargo en la cascada de autorización de escalas
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-green-50 rounded-lg border border-green-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{completos}</p>
          <p className="text-xs text-green-600 mt-1">Cargos completos (titular y adjunto)</p>
        </div>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{conVacantes}</p>
          <p className="text-xs text-amber-600 mt-1">Con alguna vacante</p>
        </div>
      </div>

      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Cargos de la cascada
      </h2>

      <div className="space-y-4">
        {cargos.map((cargo) => (
          <div key={cargo.rol_autorizador} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{cargo.nombre_rol}</p>
            </div>

            <div className="divide-y divide-gray-100">
              <FilaPosicion
                etiqueta="Titular"
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
              <FilaPosicion
                etiqueta="Adjunto"
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
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilaPosicion({
  etiqueta, persona, estaAbierto, estaGuardando, estaGuardado,
  error, candidatos, cargandoCandidatos, onAbrir, onElegir,
}) {
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
              ✓ Guardado
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
            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
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
            <p className="text-sm text-gray-400">No hay ningún usuario con este Rol asignado todavía.</p>
          ) : (
            <ul className="space-y-1">
              {candidatos.map((c) => (
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