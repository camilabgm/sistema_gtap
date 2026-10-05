"use client"

// src/components/shared/SubItemEscalas.js
//
// Nombre heredado de cuando era exclusivo de Escalas — quedó genérico
// (nombre/ruta/Icono/activo/badge/colapsado) y ahora también lo usa
// SICEM. Extraído de Navbar.js a su propio archivo para poder reusarlo
// en vez de duplicar el mismo componente visual.
//
// CAMBIO (rama fix/responsive-base): con el sidebar cerrado, antes se
// mostraba solo el ícono, y el nombre únicamente como tooltip nativo
// (title) — que en una tablet táctil no existe. Ahora, cerrado, se ve
// el ícono con su nombre en letra chica debajo, mismo formato que los
// módulos principales del sidebar. La prop opcional "corto" es el
// nombre que entra en los 80px del sidebar cerrado ("Pendientes" en
// vez de "Pendientes de autorizar"); si no se pasa, se usa "nombre".
// El title con el nombre completo se mantiene, para quien tenga mouse.

import Link from "next/link"

export default function SubItemEscalas({ nombre, corto, ruta, Icono, activo, badge, colapsado }) {
  if (colapsado) {
    return (
      <Link
        href={ruta}
        title={badge > 0 ? `${nombre} (${badge})` : nombre}
        className={`relative flex flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1.5 transition-colors ${
          activo ? "bg-blue-600 text-white" : "text-gray-400 hover:bg-gray-700 hover:text-white"
        }`}
      >
        <Icono size={15} className="shrink-0" />
        <span className="w-full truncate text-center text-[10px] leading-tight">{corto || nombre}</span>
        {badge > 0 && <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-red-500" />}
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