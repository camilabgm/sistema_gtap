"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

export default function VerificadorSesion() {
  const pathname             = usePathname()
  const [cuenta, setCuenta]  = useState(null)

  useEffect(() => {
    const timeout = setTimeout(async () => {
      try {
        const res  = await fetch("/api/sesion/verificar")
        const data = await res.json()
        if (data.invalida) {
          setCuenta(5)
        }
      } catch {}
    }, 500)

    return () => clearTimeout(timeout)
  }, [pathname])

  useEffect(() => {
    if (cuenta === null) return
    if (cuenta === 0) {
      signOut({ callbackUrl: "/login" })
      return
    }
    const intervalo = setInterval(() => {
      setCuenta((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(intervalo)
  }, [cuenta])

  if (cuenta === null) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white rounded-xl shadow-xl px-6 py-4 max-w-sm">
      <p className="font-semibold text-sm mb-1">Sesión actualizada</p>
      <p className="text-gray-300 text-sm">
        Tu rol fue modificado. Serás redirigido al login en{" "}
        <span className="font-bold text-white">{cuenta}</span> segundo{cuenta !== 1 ? "s" : ""}.
      </p>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="mt-3 w-full text-sm bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg transition-colors"
      >
        Cerrar sesión ahora
      </button>
    </div>
  )
}