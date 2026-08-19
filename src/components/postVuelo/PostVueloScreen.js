"use client"

// Pantalla principal de Post-Vuelo: lista de escalas a la izquierda +
// panel de detalle a la derecha, mismo patrón que ManifiestoScreen.js.
// A diferencia de Manifiesto, no hace falta un fetch de "detalle"
// aparte — PanelPostVuelo ya se encarga de traer el post-vuelo de la
// escala seleccionada por su cuenta.

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import ListaEscalasPostVuelo from "./ListaEscalasPostVuelo"
import PanelPostVuelo from "./PanelPostVuelo"

export default function PostVueloScreen() {
  const searchParams = useSearchParams()
  const idDesdeUrl = (() => {
  const n = parseInt(searchParams.get("escala"), 10)
    return Number.isInteger(n) && n > 0 ? n : null
  })()

  const [escalas, setEscalas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [errorLista, setErrorLista] = useState(null)
  const [busqueda, setBusqueda] = useState("")
  const [escalaSeleccionadaId, setEscalaSeleccionadaId] = useState(idDesdeUrl)

  const cargarLista = useCallback(async (q) => {
    setCargandoLista(true)
    setErrorLista(null)
    try {
      const url = q ? `/api/post-vuelo?q=${encodeURIComponent(q)}` : "/api/post-vuelo"
      const res = await fetch(url, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista de escalas")
      setEscalas(data)
      setEscalaSeleccionadaId((actual) => actual ?? (data.length > 0 ? data[0].id : null))
    } catch (err) {
      setErrorLista(err.message)
    } finally {
      setCargandoLista(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    cargarLista(undefined)
  }, [cargarLista])

  useEffect(() => {
    const timeout = setTimeout(() => cargarLista(busqueda), 300)
    return () => clearTimeout(timeout)
  }, [busqueda, cargarLista])

  const escalaSeleccionada = escalas.find((e) => e.id === escalaSeleccionadaId) ?? null

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="w-full max-w-sm shrink-0">
        <ListaEscalasPostVuelo
          escalas={escalas}
          cargando={cargandoLista}
          error={errorLista}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          escalaSeleccionadaId={escalaSeleccionadaId}
          onSeleccionar={setEscalaSeleccionadaId}
        />
      </div>

      <div className="flex-1 min-w-0">
        {!escalaSeleccionada ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-400">
            Seleccioná una escala de la lista
          </div>
        ) : (
          <PanelPostVuelo
            key={escalaSeleccionada.id}
            escala={escalaSeleccionada}
            onActualizada={() => cargarLista(busqueda)}
          />
        )}
      </div>
    </div>
  )
}