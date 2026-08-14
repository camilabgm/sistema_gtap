"use client"

// Pantalla principal de Manifiesto: lista de escalas a la izquierda +
// panel de detalle a la derecha, calcado del mockup aprobado.
// Mantiene todo el estado (lista, selección, detalle) y se lo pasa a
// los hijos por props — los hijos no hacen fetch por su cuenta.

import { useState, useEffect, useCallback } from "react"
import { usuarioPuedeGestionarManifiesto } from "@/lib/manifiesto"
import ListaEscalas from "./ListaEscalas"
import PanelDetalle from "./PanelDetalle"

export default function ManifiestoScreen({ session }) {
  const [escalas, setEscalas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  const [escalaSeleccionadaId, setEscalaSeleccionadaId] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState(null)

  const cargarLista = useCallback(async (q) => {
    setCargandoLista(true)
    try {
      const url = q ? `/api/manifiesto?q=${encodeURIComponent(q)}` : "/api/manifiesto"
      const res = await fetch(url)
      if (!res.ok) throw new Error("No se pudo cargar la lista de escalas")
      const data = await res.json()
      setEscalas(data)
      // Si todavía no hay nada seleccionado, seleccionar la primera de la lista.
      if (!escalaSeleccionadaId && data.length > 0) {
        setEscalaSeleccionadaId(data[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoLista(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Carga inicial de la lista
  useEffect(() => {
    cargarLista(undefined)
  }, [cargarLista])

  // Buscar con un pequeño debounce, para no pegarle a la API en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => cargarLista(busqueda), 300)
    return () => clearTimeout(timeout)
  }, [busqueda, cargarLista])

  // Cargar detalle cada vez que cambia la selección
  useEffect(() => {
    cargarDetalle(escalaSeleccionadaId)
  }, [escalaSeleccionadaId, cargarDetalle])

  // Refresca lista Y detalle — se usa después de agregar/editar/borrar
  // un pasajero o una carga, para que el contador de la lista izquierda
  // y el panel derecho queden sincronizados.
  const refrescarTodo = useCallback(() => {
    cargarLista(busqueda)
    cargarDetalle(escalaSeleccionadaId)
  }, [busqueda, escalaSeleccionadaId, cargarLista, cargarDetalle])

  const puedeGestionar = detalle ? usuarioPuedeGestionarManifiesto(session, detalle) : false

  return (
    <div className="flex h-full gap-4 p-4">
      <div className="w-full max-w-sm shrink-0">
        <ListaEscalas
          escalas={escalas}
          cargando={cargandoLista}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          escalaSeleccionadaId={escalaSeleccionadaId}
          onSeleccionar={setEscalaSeleccionadaId}
        />
      </div>

      <div className="flex-1 min-w-0">
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
          <PanelDetalle detalle={detalle} puedeGestionar={puedeGestionar} onCambio={refrescarTodo} />
        )}
      </div>
    </div>
  )
}