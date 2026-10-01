"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { useVistaMobileMaestroDetalle } from "@/hooks/useVistaMobileMaestroDetalle"
import BotonVolver from "@/components/shared/BotonVolver"
import BotonVolverInicio from "@/components/shared/BotonVolverInicio"
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

  const { esMobile, mostrarLista, mostrarDetalle, abrirDetalle, volverALista } =
    useVistaMobileMaestroDetalle(!!idDesdeUrl)

  const cargarLista = useCallback(async (q) => {
    setCargandoLista(true)
    setErrorLista(null)
    try {
      const url = q ? `/api/post-vuelo?q=${encodeURIComponent(q)}` : "/api/post-vuelo"
      const res = await fetch(url, { credentials: "include" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "No se pudo cargar la lista de escalas")
      setEscalas(data)
      setEscalaSeleccionadaId((actual) => {
        if (actual) return actual
        if (esMobile === true) return actual
        return data.length > 0 ? data[0].id : null
      })
    } catch (err) {
      setErrorLista(err.message)
    } finally {
      setCargandoLista(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esMobile])

  useEffect(() => {
    cargarLista(undefined)
  }, [cargarLista])

  useEffect(() => {
    const timeout = setTimeout(() => cargarLista(busqueda), 300)
    return () => clearTimeout(timeout)
  }, [busqueda, cargarLista])

  function handleSeleccionar(id) {
    setEscalaSeleccionadaId(id)
    abrirDetalle()
  }

  const escalaSeleccionada = escalas.find((e) => e.id === escalaSeleccionadaId) ?? null

  if (esMobile === null) return null

  return (
    <div className="p-4">
      {/* Lista: "Volver a Inicio" (fijo al Dashboard) — no hay una
          pantalla "anterior" con sentido acá, solo un lugar claro
          adonde volver. */}
      {esMobile === true && mostrarLista && <BotonVolverInicio />}

      <div className="flex h-full gap-4">
        {mostrarLista && (
          <div className={esMobile ? "w-full" : "w-full max-w-sm shrink-0"}>
            <ListaEscalasPostVuelo
              escalas={escalas}
              cargando={cargandoLista}
              error={errorLista}
              busqueda={busqueda}
              onBuscar={setBusqueda}
              escalaSeleccionadaId={escalaSeleccionadaId}
              onSeleccionar={handleSeleccionar}
            />
          </div>
        )}

        {mostrarDetalle && (
          <div className="flex-1 min-w-0">
            {/* Detalle: "Volver a la lista" — se queda DENTRO del
                módulo, toggle interno, no navega a otra URL. */}
            {esMobile && <BotonVolver etiqueta="Volver a la lista" onClick={volverALista} />}
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
        )}
      </div>
    </div>
  )
}