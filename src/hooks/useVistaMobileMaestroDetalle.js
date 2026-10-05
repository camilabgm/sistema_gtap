"use client"

// src/hooks/useVistaMobileMaestroDetalle.js
//
// Coordina el patrón lista+detalle (Post-Vuelo, Manifiesto) según el
// ancho de pantalla. En pantalla "compacta" (celular y tablet, menos
// de 1024px) se muestran de a una: lista sola, o detalle solo con
// botón de volver. Desde 1024px, lista y detalle conviven lado a lado.
//
// CAMBIO (rama fix/responsive-maestro-detalle): antes el corte era el
// de celular (768px, useDeviceType). En una tablet de 768, con el
// sidebar, lista y detalle quedaban mitad y mitad y el detalle tenía
// unos 300px — menos que un celular. Ahora usa usePantallaCompacta()
// (1024px), y el valor que devuelve se llama "esCompacta" en vez de
// "esMobile", porque en tablet también es verdadero.
//
// hayIdDesdeUrl: true si la pantalla se abrió con ?escala=<id> en la
// URL (ej. desde una tarjeta del dashboard) — en ese caso arranca
// mostrando el detalle directo, porque la persona ya eligió una escala.

import { useState } from "react"
import { usePantallaCompacta } from "@/hooks/useDeviceType"

export function useVistaMobileMaestroDetalle(hayIdDesdeUrl) {
  const esCompacta = usePantallaCompacta()
  const [verDetalle, setVerDetalle] = useState(hayIdDesdeUrl)

  return {
    esCompacta,
    // Desde 1024px los dos bloques se muestran siempre — estos 2
    // valores solo deciden algo real en pantalla compacta.
    mostrarLista: esCompacta === false ? true : !verDetalle,
    mostrarDetalle: esCompacta === false ? true : verDetalle,
    abrirDetalle: () => setVerDetalle(true),
    volverALista: () => setVerDetalle(false),
  }
}