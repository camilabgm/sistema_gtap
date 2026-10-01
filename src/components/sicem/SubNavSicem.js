"use client"

// Sub-menú de SICEM, solo para mobile — mismas 4 pestañas y mismo
// criterio que el submenú desplegable de Navbar.js en escritorio
// (SICEM.puede_ver), con el estilo de pestañas claras ya usado en
// SubNavEscalas. Incluye BotonVolverInicio, igual que la versión
// final de SubNavEscalas.
//
// AJUSTE: padding y texto más chicos que en SubNavEscalas — acá hay
// 4 pestañas con palabras más largas ("Componentes", "Estadística")
// que en Escalas, así que se necesita apretar un poco más para que
// entren mejor en pantallas angostas. Aun así, en celulares muy
// angostos puede seguir haciendo falta el scroll horizontal — con
// este texto no hay garantía total, pero entra mejor que antes.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useDeviceType } from "@/hooks/useDeviceType"
import { useBadgesDashboard } from "@/hooks/useBadgesDashboard"
import BotonVolverInicio from "@/components/shared/BotonVolverInicio"

export default function SubNavSicem({ permisos, esCargoDeCascada }) {
  const esMobile = useDeviceType()
  const pathname = usePathname()
  const { alertasSicem } = useBadgesDashboard(permisos, esCargoDeCascada)

  if (esMobile !== true) return null

  const veSicem = !!permisos?.SICEM?.puede_ver
  if (!veSicem) return null

  const tabs = [
    { ruta: "/dashboard/sicem/alertas", label: "Alertas", badge: alertasSicem },
    { ruta: "/dashboard/sicem/componentes", label: "Componentes" },
    { ruta: "/dashboard/sicem/eventos", label: "Eventos" },
    { ruta: "/dashboard/sicem/estadisticas", label: "Estadística" },
  ]

  return (
    <div className="px-4 pt-4">
      <BotonVolverInicio />
      <div className="flex gap-0.5 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1">
        {tabs.map((tab) => {
          const activo = pathname === tab.ruta
          return (
            <Link
              key={tab.ruta}
              href={tab.ruta}
              className={`whitespace-nowrap flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                activo
                  ? "border border-gray-200 bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}