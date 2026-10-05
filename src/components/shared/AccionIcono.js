"use client"

// src/components/shared/AccionIcono.js
//
// Botón de acción con ícono + tooltip al pasar el cursor — mismo patrón
// visual para cualquier acción de fila (ver, editar, borrar, manifiesto,
// post-vuelo, etc.) en CUALQUIER módulo del sistema.
//
// El tooltip se renderiza con un portal directo a document.body, en
// posición fixed calculada a partir del ícono. Esto es intencional:
// si lo dejábamos como hijo normal, cualquier contenedor padre con
// scroll (overflow-y-auto) lo recorta por el costado. Con el portal,
// el tooltip vive fuera de ese contenedor y nunca se recorta.
//
// Cuando está deshabilitado, NO se renderiza como <button disabled> —
// los navegadores no disparan onMouseEnter sobre un elemento con
// pointer-events:none, así que el tooltip nunca llegaba a mostrarse.
// Usa un <span> inerte, igual que la rama de href.
//
// Etiqueta visible vs. tooltip:
//   - Debajo de 1024px (celular y tablet): el botón muestra ícono +
//     etiqueta como texto visible, con ancho automático. Tocar en una
//     pantalla táctil no tiene "pasar el mouse", así que el tooltip no
//     serviría.
//   - Desde 1024px: solo el ícono (cuadrado 32×32), con el tooltip al
//     pasar el mouse.
//   - El tooltip solo se abre si el dispositivo tiene un puntero real
//     (mouse/trackpad) Y la pantalla es de 1024px o más — o sea, solo
//     cuando la etiqueta NO está a la vista.
//
// CAMBIO (rama fix/responsive-listados): el corte pasa de 768px (md:)
// a 1024px (lg:). En tablet los listados ahora se ven como tarjetas,
// igual que en celular, y una tablet es táctil — las etiquetas
// visibles le sirven más que un tooltip que no puede abrir.
//
// Props:
//   etiqueta → nombre CORTO de la acción ("Editar", "Manifiesto"). Es
//              lo que se lee debajo de 1024px.
//   tooltip  → opcional: texto LARGO para el globo de escritorio y
//              para lectores de pantalla (ej. por qué está bloqueada).
//              Si no se pasa, se usa la etiqueta.

import { useState, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"

const COLORES = {
  default: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  peligro: "text-red-500 hover:text-red-700 hover:bg-red-50",
  primario: "text-blue-500 hover:text-blue-700 hover:bg-blue-50",
}

// Media query única para decidir si tiene sentido mostrar el tooltip:
// - (hover: hover) and (pointer: fine): hay mouse/trackpad, no solo dedo.
// - (min-width: 1024px): la etiqueta de texto está oculta (lg:hidden),
//   así que el tooltip es la única forma de saber qué hace el ícono.
const MEDIA_TOOLTIP = "(hover: hover) and (pointer: fine) and (min-width: 1024px)"

// Se consulta en el momento del evento (no se guarda en un estado al
// montar), así si alguien achica o agranda la ventana del navegador
// el comportamiento se ajusta solo, sin recargar la página.
function tooltipPermitido() {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia(MEDIA_TOOLTIP).matches
}

export default function AccionIcono({ icono: Icono, etiqueta, tooltip, onClick, href, color = "default", disabled = false }) {
  const [mostrarTooltip, setMostrarTooltip] = useState(false)
  const [posicion, setPosicion] = useState(null)
  const botonRef = useRef(null)

  // Texto completo: el que va en el globo de escritorio y en el
  // aria-label. Si el módulo no pasó tooltip, es la misma etiqueta.
  const textoCompleto = tooltip || etiqueta

  useLayoutEffect(() => {
    if (!mostrarTooltip || !botonRef.current) return
    const rect = botonRef.current.getBoundingClientRect()
    setPosicion({
      top: rect.top - 6,
      right: window.innerWidth - rect.right,
    })
  }, [mostrarTooltip])

  // Forma del botón:
  // - debajo de 1024px: alto 32px, ancho automático, ícono + texto chico.
  // - desde lg: vuelve al cuadrado 32×32 de siempre, sin padding ni gap
  //   (el texto queda oculto con lg:hidden, así que solo queda el ícono).
  const forma =
    "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium lg:w-8 lg:gap-0 lg:px-0"

  const clases = `${forma} transition-colors ${COLORES[color]}`
  const clasesDeshabilitado = `${forma} text-gray-300 cursor-not-allowed`

  const eventos = {
    onMouseEnter: () => { if (tooltipPermitido()) setMostrarTooltip(true) },
    onMouseLeave: () => setMostrarTooltip(false),
    onFocus: () => { if (tooltipPermitido()) setMostrarTooltip(true) },
    onBlur: () => setMostrarTooltip(false),
  }

  // Contenido interno, igual para las 4 variantes (botón, link, y sus
  // dos versiones deshabilitadas): ícono + etiqueta corta visible
  // debajo de 1024px + tooltip con el texto completo (que ya decide
  // solo si se muestra o no).
  const contenido = (
    <>
      <Icono className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap lg:hidden">{etiqueta}</span>
      {mostrarTooltip && posicion && typeof document !== "undefined"
        ? createPortal(
            <span
              style={{ position: "fixed", top: posicion.top, right: posicion.right, transform: "translateY(-100%)" }}
              className="pointer-events-none z-50 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-sm"
            >
              {textoCompleto}
            </span>,
            document.body
          )
        : null}
    </>
  )

  // Los <a> no tienen atributo "disabled" — a diferencia del <button>,
  // hay que directamente NO renderizarlo como link cuando está
  // deshabilitado, o el navegador lo sigue dejando clickeable.
  if (href) {
    if (disabled) {
      return (
        <span ref={botonRef} className={clasesDeshabilitado} aria-label={textoCompleto} aria-disabled="true" {...eventos}>
          {contenido}
        </span>
      )
    }
    return (
      <a href={href} ref={botonRef} className={clases} aria-label={textoCompleto} {...eventos}>
        {contenido}
      </a>
    )
  }

  if (disabled) {
    return (
      <span ref={botonRef} className={clasesDeshabilitado} aria-label={textoCompleto} aria-disabled="true" {...eventos}>
        {contenido}
      </span>
    )
  }

  return (
    <button type="button" ref={botonRef} onClick={onClick} className={clases} aria-label={textoCompleto} {...eventos}>
      {contenido}
    </button>
  )
}