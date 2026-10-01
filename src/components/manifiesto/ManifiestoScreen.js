"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"
import { useVistaMobileMaestroDetalle } from "@/hooks/useVistaMobileMaestroDetalle"
import BotonVolver from "@/components/shared/BotonVolver"
import BotonVolverInicio from "@/components/shared/BotonVolverInicio"
import ListaEscalas from "./ListaEscalas"
import PanelDetalle from "./PanelDetalle"

export default function ManifiestoScreen({ session }) {
  const searchParams = useSearchParams()
  const idDesdeUrl = (() => {
    const n = parseInt(searchParams.get("escala"), 10)
    return Number.isInteger(n) && n > 0 ? n : null
  })()

  const [escalas, setEscalas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  const [escalaSeleccionadaId, setEscalaSeleccionadaId] = useState(idDesdeUrl)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)

  const { esMobile, mostrarLista, mostrarDetalle, abrirDetalle, volverALista } =
    useVistaMobileMaestroDetalle(!!idDesdeUrl)

  const cargarLista = useCallback(async (q) => {
    setCargandoLista(true)
    try {
      const url = q ? `/api/manifiesto?q=${encodeURIComponent(q)}` : "/api/manifiesto"
      const res = await fetch(url)
      if (!res.ok) throw new Error("No se pudo cargar la lista de escalas")
      const data = await res.json()
      setEscalas(data)
      setEscalaSeleccionadaId((actual) => {
        if (actual) return actual
        if (esMobile === true) return actual
        return data.length > 0 ? data[0].id : null
      })
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoLista(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esMobile])

  const cargarDetalle = useCallback(async (id) => {
    if (!id) return
    setCargandoDetalle(true)
    setErrorDetalle(null)
    try {
      const res = await fetch(`/api/manifiesto/${id}`)
      if (!res.ok) throw new Error("No se pudo cargar el detalle de la escala")
      const data = await res.json()
      setDetalle(data)
    } catch (err) {
      setErrorDetalle(err.message)
      setDetalle(null)
    } finally {
      setCargandoDetalle(false)
    }
  }, [])

  useEffect(() => {
    cargarLista(undefined)
  }, [cargarLista])

  useEffect(() => {
    const timeout = setTimeout(() => cargarLista(busqueda), 300)
    return () => clearTimeout(timeout)
  }, [busqueda, cargarLista])

  useEffect(() => {
    cargarDetalle(escalaSeleccionadaId)
  }, [escalaSeleccionadaId, cargarDetalle])

  const refrescarTodo = useCallback(() => {
    cargarLista(busqueda)
    cargarDetalle(escalaSeleccionadaId)
  }, [busqueda, escalaSeleccionadaId, cargarLista, cargarDetalle])

  function handleSeleccionar(id) {
    setEscalaSeleccionadaId(id)
    abrirDetalle()
  }

  const puedeGestionar = detalle ? usuarioPuedeGestionarManifiesto(session, detalle) : false
  const puedeEliminarManifiesto = !!session?.user?.permisos?.MANIFIESTO?.puede_eliminar

  if (esMobile === null) return null

  return (
    <div className="p-4">
      {/* Lista: "Volver a Inicio" (fijo al Dashboard). */}
      {esMobile === true && mostrarLista && <BotonVolverInicio />}

      <div className="flex h-full gap-4">
        {mostrarLista && (
          <div className={esMobile ? "w-full" : "w-full max-w-sm shrink-0"}>
            <ListaEscalas
              escalas={escalas}
              cargando={cargandoLista}
              busqueda={busqueda}
              onBuscar={setBusqueda}
              escalaSeleccionadaId={escalaSeleccionadaId}
              onSeleccionar={handleSeleccionar}
            />
          </div>
        )}

        {mostrarDetalle && (
          <div className="flex-1 min-w-0">
            {/* Detalle: "Volver a la lista" — se queda DENTRO del módulo. */}
            {esMobile && <BotonVolver etiqueta="Volver a la lista" onClick={volverALista} />}
            {cargandoDetalle && (
              <div className="flex h-full items-center justify-center text-gray-400">Cargando…</div>
            )}
            {!cargandoDetalle && errorDetalle && (
              <div className="flex h-full items-center justify-center text-red-500">{errorDetalle}</div>
            )}
            {!cargandoDetalle && !errorDetalle && !detalle && (
              <div className="flex h-full items-center justify-center text-gray-400">
                Seleccioná una escala de la lista
              </div>
            )}
            {!cargandoDetalle && !errorDetalle && detalle && (
              <PanelDetalle
                detalle={detalle}
                puedeGestionar={puedeGestionar}
                puedeEliminar={puedeEliminarManifiesto}
                onCambio={refrescarTodo}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}