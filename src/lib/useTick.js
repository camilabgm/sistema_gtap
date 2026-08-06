"use client"

// src/lib/useTick.js
//
// Separado de lib/escalas.js a propósito: es un Hook de React, y
// lib/escalas.js ahora lo importan también archivos de servidor
// (route.js), donde un Hook rompe el build.

import { useEffect, useState } from "react"

// Fuerza un re-render cada cierto intervalo, para que los cálculos que
// dependen de "la hora actual" (como calcularEstadoVisual) se
// actualicen solos, sin depender de que la persona haga clic en algo.
export function useTick(intervaloMs = 30000) {
  const [, forzarRender] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forzarRender((n) => n + 1), intervaloMs)
    return () => clearInterval(id)
  }, [intervaloMs])
}