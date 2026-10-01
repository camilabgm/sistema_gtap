"use client"

import Link from "next/link"
import { Home } from "lucide-react"

// "Volver a Inicio" — a diferencia de BotonVolver (que depende de
// dónde estaba la persona antes: router.back(), o un toggle interno),
// este SIEMPRE lleva al Dashboard, sin importar el historial de
// navegación. Mismo destino fijo en cualquier módulo del sistema —
// un solo componente compartido, para no repetir este mismo Link en
// cada pantalla que lo necesite.
export default function BotonVolverInicio() {
  return (
    <Link
      href="/dashboard"
      className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      <Home size={16} />
      Volver a Inicio
    </Link>
  )
}