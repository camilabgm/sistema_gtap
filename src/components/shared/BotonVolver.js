"use client"

import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"

// Botón "volver" genérico, mismo estilo en todo el sistema — un solo
// componente, dos formas de usarlo:
//
// 1) Sin onClick (default): usa router.back(), que vuelve a la
//    ENTRADA ANTERIOR REAL del historial de navegación — para
//    pantallas de página completa sin sub-menú (formularios) o
//    listas que no tienen otro camino de vuelta al Dashboard.
//
// 2) Con onClick: ejecuta lo que se le pase en vez de navegar — para
//    cuando "volver" no es cambiar de URL, sino cambiar qué se
//    muestra DENTRO de la misma pantalla (ej. el toggle
//    detalle→lista de Post-Vuelo/Manifiesto en mobile, manejado por
//    useVistaMobileMaestroDetalle).
export default function BotonVolver({ etiqueta = "Volver", onClick }) {
  const router = useRouter()
  return (
    <button
      onClick={onClick || (() => router.back())}
      className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
    >
      <ChevronLeft size={18} />
      {etiqueta}
    </button>
  )
}