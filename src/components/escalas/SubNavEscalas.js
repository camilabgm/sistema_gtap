"use client"

// Sub-menú de Escalas, solo para mobile — mismas pestañas y mismo
// criterio de permisos que el submenú desplegable de Navbar.js en
// escritorio (ESCALAS.puede_ver, esCargoDeCascada, ROLES_ADMIN),
// pero con el estilo de pestañas claras que ya usa el resto del
// sistema para este mismo tipo de sub-navegación (ver InformesTabs.js
// e InformeTotales.js) — no el componente oscuro de sidebar, que
// queda descontextualizado fuera de la columna oscura donde vive.
//
// Recibe permisos, rol y esCargoDeCascada tal cual se los pasan a
// Navbar — calcula acá adentro qué pestañas mostrar, en vez de que
// cada page.js repita ese cálculo.
//
// CAMBIO: agrega "← Volver" al Dashboard, arriba de las pestañas —
// en mobile, estas 4 pantallas se entra directo desde la barra
// inferior o desde "Más", sin el sidebar (donde vive el link a
// Inicio) visible para volver. Mismo estilo que ya usan los botones
// "Volver a la lista" de Post-Vuelo/Manifiesto en mobile.
//
// Sin esto, alguien que entra a Escalas por la barra inferior de
// mobile (que ya apunta directo a una sub-página según su rol —
// Agenda para tripulación, Aprobaciones para cascada) queda sin
// ninguna forma de moverse a las otras sub-páginas del módulo, ni de
// volver al inicio.

import Link from "next/link"
import { usePathname } from "next/navigation"
import BotonVolverInicio from "@/components/shared/BotonVolverInicio"
import { useDeviceType } from "@/hooks/useDeviceType"
import { useBadgesDashboard } from "@/hooks/useBadgesDashboard"
import { ROLES_ADMIN } from "@/lib/autorizacion"

export default function SubNavEscalas({ permisos, rol, esCargoDeCascada }) {
  const esMobile = useDeviceType()
  const pathname = usePathname()
  const { pendientesParaMi } = useBadgesDashboard(permisos, esCargoDeCascada)

  // En desktop no existe este sub-menú — ya está el desplegable de
  // Navbar.js. Mientras esMobile todavía es null (montaje inicial),
  // tampoco se renderiza, mismo criterio que el resto de la rama.
  if (esMobile !== true) return null

  const veEscalas = !!permisos?.ESCALAS?.puede_ver
  const esAdmin = ROLES_ADMIN.includes(rol)

  const tabs = [
    veEscalas && { ruta: "/dashboard/escalas", label: "Agenda" },
    veEscalas && { ruta: "/dashboard/escalas/historial", label: "Gestión" },
    esCargoDeCascada && { ruta: "/dashboard/escalas/pendientes-autorizar", label: "Aprobaciones", badge: pendientesParaMi },
    esAdmin && { ruta: "/dashboard/escalas/cargos-autorizacion", label: "Cargos" },
  ].filter(Boolean)

  return (
    <div className="px-4 pt-4">
    <BotonVolverInicio />

      {/* Con una sola pestaña visible (o ninguna) no hay nada entre
          qué elegir — el "Volver" de arriba se muestra igual. */}
      {tabs.length > 1 && (
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-1.5">
          {tabs.map((tab) => {
            const activo = pathname === tab.ruta
            return (
              <Link
                key={tab.ruta}
                href={tab.ruta}
                className={`whitespace-nowrap flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
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
      )}
    </div>
  )
}