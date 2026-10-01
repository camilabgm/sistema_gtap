"use client"

import { useState } from "react"
import { useDeviceType } from "@/hooks/useDeviceType"

// Coordina el patrón lista+detalle (Post-Vuelo, Manifiesto) según el
// dispositivo. En desktop no cambia nada — lista y detalle conviven
// lado a lado como siempre. En mobile, se muestran de a una: lista
// sola, o detalle solo con botón de volver.
//
// hayIdDesdeUrl: true si la pantalla se abrió con ?escala=<id> en la
// URL (ej. desde una tarjeta del dashboard) — en ese caso arranca
// mostrando el detalle directo, incluso en mobile, porque la persona
// ya eligió una escala puntual antes de llegar acá.
export function useVistaMobileMaestroDetalle(hayIdDesdeUrl) {
  const esMobile = useDeviceType()
  const [verDetalle, setVerDetalle] = useState(hayIdDesdeUrl)

  return {
    esMobile,
    // En desktop, los dos bloques se muestran siempre — estos 2
    // valores solo determinan algo real en mobile.
    mostrarLista: esMobile === false ? true : !verDetalle,
    mostrarDetalle: esMobile === false ? true : verDetalle,
    abrirDetalle: () => setVerDetalle(true),
    volverALista: () => setVerDetalle(false),
  }
}