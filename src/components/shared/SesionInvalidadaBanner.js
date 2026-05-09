"use client"

import { signOut } from "next-auth/react"

export default function SesionInvalidadaBanner() {
  return (
    <div className="mb-6 flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-yellow-800 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-xl">⚠️</span>
        <p className="text-sm font-medium">
          Tus permisos fueron actualizados por el Comandante.
          Volvé a iniciar sesión para que los cambios tomen efecto.
        </p>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="ml-4 shrink-0 rounded-md bg-yellow-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-yellow-700 transition-colors"
      >
        Cerrar sesión ahora
      </button>
    </div>
  )
}