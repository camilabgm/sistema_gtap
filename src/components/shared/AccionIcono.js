"use client"

// Botón de acción con ícono + tooltip al pasar el cursor — mismo patrón
// visual para cualquier acción de fila (ver, editar, borrar, manifiesto,
// post-vuelo, etc.) en CUALQUIER módulo del sistema.
//
// El tooltip se renderiza con un portal directo a document.body, en
// posición fixed calculada a partir del ícono. Esto es intencional:
// si lo dejábamos como hijo normal, cualquier contenedor padre con
// scroll (overflow-y-auto) lo recorta por el costado — CSS obliga a
// que overflow-x se comporte igual que overflow-y en ese caso, así
// que un tooltip centrado sobre un ícono pegado al borde derecho
// quedaba cortado. Con el portal, el tooltip vive fuera de ese
// contenedor y nunca se recorta.

import { useState, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"

const COLORES = {
  default: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  peligro: "text-red-500 hover:text-red-700 hover:bg-red-50",
  primario: "text-blue-500 hover:text-blue-700 hover:bg-blue-50",
}

export default function AccionIcono({ icono: Icono, etiqueta, onClick, href, color = "default", disabled = false }) {
  const [mostrarTooltip, setMostrarTooltip] = useState(false)
  const [posicion, setPosicion] = useState(null)
  const botonRef = useRef(null)

  useLayoutEffect(() => {
    if (!mostrarTooltip || !botonRef.current) return
    const rect = botonRef.current.getBoundingClientRect()
    setPosicion({
      top: rect.top - 6,
      right: window.innerWidth - rect.right,
    })
  }, [mostrarTooltip])

  const clases = `relative inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none ${COLORES[color]}`
  const clasesDeshabilitado = "relative inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-300 cursor-not-allowed"

  const eventos = {
    onMouseEnter: () => setMostrarTooltip(true),
    onMouseLeave: () => setMostrarTooltip(false),
    onFocus: () => setMostrarTooltip(true),
    onBlur: () => setMostrarTooltip(false),
  }

  const tooltip =
    mostrarTooltip && posicion && typeof document !== "undefined"
      ? createPortal(
          <span
            style={{ position: "fixed", top: posicion.top, right: posicion.right, transform: "translateY(-100%)" }}
            className="pointer-events-none z-50 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-sm"
          >
            {etiqueta}
          </span>,
          document.body
        )
      : null

  // Los <a> no tienen atributo "disabled" — a diferencia del <button>,
  // hay que directamente NO renderizarlo como link cuando está
  // deshabilitado, o el navegador lo sigue dejando clickeable.
  if (href) {
    if (disabled) {
      return (
        <span ref={botonRef} className={clasesDeshabilitado} aria-label={etiqueta} {...eventos}>
          <Icono className="h-4 w-4" />
          {tooltip}
        </span>
      )
    }
    return (
      <a href={href} ref={botonRef} className={clases} aria-label={etiqueta} {...eventos}>
        <Icono className="h-4 w-4" />
        {tooltip}
      </a>
    )
  }

  return (
    <button type="button" ref={botonRef} onClick={onClick} disabled={disabled} className={clases} aria-label={etiqueta} {...eventos}>
      <Icono className="h-4 w-4" />
      {tooltip}
    </button>
  )
}