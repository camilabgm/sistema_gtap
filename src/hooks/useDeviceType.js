"use client"

import { useState, useEffect } from "react"

// Único hook que decide "mobile o desktop" para TODO el sistema.
// Tablet no es una tercera categoría: hereda el layout de desktop,
// con ajustes de densidad puntuales vía clases md: de Tailwind donde
// haga falta — este hook nunca devuelve "tablet", solo true/false.
//
// Breakpoint: 768px (el md: de Tailwind). Si mañana hace falta un
// tercer estado, se agrega en este único archivo.
const BREAKPOINT_MOBILE = 768

export function useDeviceType() {
  // Arranca en null (no "false" a ciegas) para no asumir desktop
  // durante el primerísimo instante de montaje en el cliente, antes
  // de que matchMedia pueda evaluar el ancho real de la pantalla.
  // DashboardShell contempla el caso null: no monta ni Navbar ni la
  // barra de mobile hasta que esto resuelva.
  const [esMobile, setEsMobile] = useState(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE - 1}px)`)

    setEsMobile(mediaQuery.matches)

    function manejarCambio(evento) {
      setEsMobile(evento.matches)
    }

    mediaQuery.addEventListener("change", manejarCambio)
    return () => mediaQuery.removeEventListener("change", manejarCambio)
  }, [])

  return esMobile
}