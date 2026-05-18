"use client"

import { useEffect, useState, useCallback } from "react"
import { signOut } from "next-auth/react"

// Tiempo en minutos antes de mostrar la advertencia
const MINUTOS_INACTIVIDAD = 30
// Tiempo en minutos que dura la advertencia antes de cerrar sesión
const MINUTOS_ADVERTENCIA = 2

const MS_INACTIVIDAD = MINUTOS_INACTIVIDAD * 60 * 1000
const MS_ADVERTENCIA = MINUTOS_ADVERTENCIA * 60 * 1000

export default function DetectorInactividad() {
  const [mostrarAdvertencia, setMostrarAdvertencia] = useState(false)

  const cerrarSesion = useCallback(() => {
    signOut({ callbackUrl: "/login" })
  }, [])

  useEffect(() => {
    let timerInactividad
    let timerCierreFinal

    // Reinicia el conteo de inactividad desde cero
    function reiniciarTimer() {
      // Si la advertencia estaba visible, ocultarla
      setMostrarAdvertencia(false)

      // Cancelar timers anteriores
      clearTimeout(timerInactividad)
      clearTimeout(timerCierreFinal)

      // Iniciar nuevo timer de inactividad
      timerInactividad = setTimeout(() => {
        // Pasaron 30 min sin actividad: mostrar advertencia
        setMostrarAdvertencia(true)

        // Iniciar cuenta regresiva final (2 min más)
        timerCierreFinal = setTimeout(() => {
          cerrarSesion()
        }, MS_ADVERTENCIA)
      }, MS_INACTIVIDAD)
    }

    // Estos son los eventos que consideramos "actividad del usuario"
    const eventos = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"]

    eventos.forEach((evento) => {
      window.addEventListener(evento, reiniciarTimer)
    })

    // Iniciar el primer timer
    reiniciarTimer()

    // Limpiar todo cuando el componente se desmonta
    return () => {
      clearTimeout(timerInactividad)
      clearTimeout(timerCierreFinal)
      eventos.forEach((evento) => {
        window.removeEventListener(evento, reiniciarTimer)
      })
    }
  }, [cerrarSesion])

  // Si no hay advertencia, no renderizar nada
  if (!mostrarAdvertencia) return null

  // Modal de advertencia
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
        <p className="text-lg font-semibold text-gray-800 mb-2">
          Sesión por expirar
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Llevas {MINUTOS_INACTIVIDAD} minutos sin actividad.
          Tu sesión se cerrará en {MINUTOS_ADVERTENCIA} minutos.
        </p>
        <button
          onClick={() => setMostrarAdvertencia(false)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Seguir trabajando
        </button>
      </div>
    </div>
  )
}