"use client"

// src/hooks/useDeviceType.js
//
// Único archivo que decide "en qué tipo de pantalla estamos" para TODO
// el sistema. Antes respondía una sola pregunta (¿es mobile?) con un
// solo corte en 768px, y la tablet heredaba el layout de escritorio.
// Las pruebas en 768 y 1024 mostraron que eso no alcanzaba: con el
// sidebar abierto, las tablas quedaban con menos de 500px y se
// superponían columnas y acciones. Ahora hay tres zonas:
//
//   - Menos de 768px  → celular: barra inferior, tarjetas.
//   - 768 a 1023px    → tablet: sidebar, pero contenido como en
//                       celular (tarjetas, una vista a la vez).
//   - 1024px o más    → computadora: tablas, lista y detalle juntos.
//
// Y un corte más, solo para el sidebar: debajo de 1280px arranca
// cerrado y, al abrirlo, flota encima de la página en vez de empujarla.
//
// Los tres cortes coinciden a propósito con los de Tailwind (md = 768,
// lg = 1024, xl = 1280): lo que decide JavaScript con estos hooks y lo
// que deciden las clases md:/lg:/xl: siempre usan los mismos números.

import { useState, useEffect } from "react"

export const BREAKPOINT_MOBILE    = 768  // md:
export const BREAKPOINT_COMPACTO  = 1024 // lg:
export const BREAKPOINT_MENU_FIJO = 1280 // xl:

// Mecanismo único que comparten los tres hooks de abajo — antes vivía
// adentro de useDeviceType, ahora se extrae para no repetirlo tres veces.
//
// Arranca en null (no "false" a ciegas) para no asumir nada durante el
// primerísimo instante de montaje en el cliente, antes de que
// matchMedia pueda evaluar el ancho real de la pantalla. Quien use
// estos hooks tiene que contemplar el caso null (ver DashboardShell:
// no monta ninguna navegación hasta que esto resuelva).
function useMediaQuery(consulta) {
  const [coincide, setCoincide] = useState(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia(consulta)

    setCoincide(mediaQuery.matches)

    function manejarCambio(evento) {
      setCoincide(evento.matches)
    }

    mediaQuery.addEventListener("change", manejarCambio)
    return () => mediaQuery.removeEventListener("change", manejarCambio)
  }, [consulta])

  return coincide
}

// ¿Es celular? (menos de 768px) — misma respuesta de siempre, nadie
// que ya lo usa tiene que cambiar nada.
export function useDeviceType() {
  return useMediaQuery(`(max-width: ${BREAKPOINT_MOBILE - 1}px)`)
}

// ¿Es celular o tablet? (menos de 1024px) — para pantallas que tienen
// que comportarse "como celular" también en tablet: ej. Manifiesto y
// Post-Vuelo mostrando lista o detalle de a uno.
export function usePantallaCompacta() {
  return useMediaQuery(`(max-width: ${BREAKPOINT_COMPACTO - 1}px)`)
}

// ¿El sidebar flota? (menos de 1280px) — ahí arranca cerrado y, al
// abrirlo, se dibuja encima de la página en vez de empujarla.
export function useMenuFlotante() {
  return useMediaQuery(`(max-width: ${BREAKPOINT_MENU_FIJO - 1}px)`)
}