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
// scroll (overflow-y-auto) lo recorta por el costado — CSS obliga a
// que overflow-x se comporte igual que overflow-y en ese caso, así
// que un tooltip centrado sobre un ícono pegado al borde derecho
// quedaba cortado. Con el portal, el tooltip vive fuera de ese
// contenedor y nunca se recorta.
//
// Cuando está deshabilitado, NO se renderiza como <button disabled> —
// los navegadores no disparan onMouseEnter sobre un elemento con
// pointer-events:none (que es lo que agrega la clase disabled: de
// Tailwind), así que el tooltip nunca llegaba a mostrarse. Usa un
// <span> inerte, igual que la rama de href.
//
// CAMBIO (rama fix/accion-icono-mobile): en pantallas táctiles el
// tooltip no servía — "tocar" dispara a la vez el onFocus (que abría
// el tooltip) y el onClick (que ejecuta la acción), así que el globo
// aparecía flotando justo cuando la acción ya estaba en marcha. Ahora:
//
//   - Debajo de 768px (mismo breakpoint "md" que todo el sistema), el
//     botón muestra el ícono + la etiqueta como texto visible, y pasa
//     de 32×32 fijo a ancho automático para que entre el texto.
//   - Desde 768px queda exactamente igual que antes: solo ícono, con
//     el tooltip al pasar el mouse.
//   - El tooltip solo se abre si el dispositivo tiene un puntero real
//     (mouse/trackpad) Y la pantalla es de 768px o más — o sea, solo
//     cuando la etiqueta NO está a la vista.
//
// CAMBIO v2 — prop opcional "tooltip": algunos módulos usaban la
// etiqueta para explicar POR QUÉ una acción está bloqueada (ej. "No
// disponible: la escala fue abortada"). Como tooltip de escritorio eso
// estaba perfecto, pero ahora la etiqueta también se ve como texto en
// mobile, y una oración entera no entra en una fila de botones. Se
// separan las dos cosas:
//
//   - etiqueta: nombre CORTO de la acción ("Editar", "Manifiesto").
//     Es lo que se lee en mobile.
//   - tooltip (opcional): texto LARGO para el globo de escritorio y
//     para lectores de pantalla. Si no se pasa, se usa la etiqueta —
//     así todos los módulos que no lo usan siguen igual que siempre.

import { useState, useRef, useLayoutEffect } from "react"
import { createPortal } from "react-dom"

const COLORES = {
  default: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
  peligro: "text-red-500 hover:text-red-700 hover:bg-red-50",
  primario: "text-blue-500 hover:text-blue-700 hover:bg-blue-50",
}

// Media query única para decidir si tiene sentido mostrar el tooltip:
// - (hover: hover) and (pointer: fine): hay mouse/trackpad, no solo dedo.
// - (min-width: 768px): la etiqueta de texto está oculta (md:hidden),
//   así que el tooltip es la única forma de saber qué hace el ícono.
const MEDIA_TOOLTIP = "(hover: hover) and (pointer: fine) and (min-width: 768px)"

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
  // - mobile: alto 32px, ancho automático, ícono + texto chico.
  // - desde md: vuelve al cuadrado 32×32 de siempre, sin padding ni gap
  //   (el texto queda oculto con md:hidden, así que solo queda el ícono).
  const forma =
    "relative inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium md:w-8 md:gap-0 md:px-0"

  const clases = `${forma} transition-colors ${COLORES[color]}`
  const clasesDeshabilitado = `${forma} text-gray-300 cursor-not-allowed`

  const eventos = {
    onMouseEnter: () => { if (tooltipPermitido()) setMostrarTooltip(true) },
    onMouseLeave: () => setMostrarTooltip(false),
    onFocus: () => { if (tooltipPermitido()) setMostrarTooltip(true) },
    onBlur: () => setMostrarTooltip(false),
  }

  // Contenido interno, igual para las 4 variantes (botón, link, y sus
  // dos versiones deshabilitadas): ícono + etiqueta corta visible solo
  // en mobile + tooltip con el texto completo (que ya decide solo si
  // se muestra o no).
  const contenido = (
    <>
      <Icono className="h-4 w-4 shrink-0" />
      <span className="whitespace-nowrap md:hidden">{etiqueta}</span>
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