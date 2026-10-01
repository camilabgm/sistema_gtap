"use client"

import Link from "next/link"

// Nombre heredado de cuando era exclusivo de Escalas — quedó genérico
// (nombre/ruta/Icono/activo/badge/colapsado) y ahora también lo usa
// SICEM. Extraído de Navbar.js a su propio archivo para que
// SubNavEscalas.js (la versión mobile del mismo submenú) lo reuse
// también, en vez de duplicar el mismo componente visual dos veces.
export default function SubItemEscalas({ nombre, ruta, Icono, activo, badge, colapsado }) {
  if (colapsado) {
    return (
      <Link
        href={ruta}
        title={badge > 0 ? `${nombre} (${badge})` : nombre}
        className={`relative flex items-center justify-center py-2 rounded-md transition-colors ${
          activo ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
        }`}
      >
        <Icono size={16} />
        {badge > 0 && <span className="absolute top-1 right-3.5 w-2 h-2 bg-red-500 rounded-full" />}
      </Link>
    )
  }
  return (
    <Link
      href={ruta}
      className={`flex items-center justify-between pl-8 pr-4 py-1.5 rounded-md text-sm transition-colors ${
        activo ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:bg-gray-700 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-2">
        <Icono size={14} className="shrink-0" />
        {nombre}
      </span>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
          {badge}
        </span>
      )}
    </Link>
  )
}