"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { signOut } from "next-auth/react"
import {
  CalendarDays, PlaneLanding, FileText, Wrench, BarChart3, Plane, Users,
  Tag, CalendarCheck, MoreHorizontal, X, KeyRound, LogOut, Lock, ScrollText,
} from "lucide-react"
import { useBadgesDashboard } from "@/hooks/useBadgesDashboard"
import { armarNavegacionMobile } from "@/lib/navegacionMobile"
import { ROLES_ADMIN } from "@/lib/autorizacion"

// Mismo set de íconos que ya usa Navbar.js para los mismos módulos —
// no se inventan íconos nuevos para mobile, la idea es que el usuario
// reconozca el mismo símbolo en las dos superficies.
const ICONOS = {
  escalas: CalendarDays,
  postVuelo: PlaneLanding,
  manifiesto: FileText,
  sicem: Wrench,
  informes: BarChart3,
  aeronaves: Plane,
  personas: Users,
  tiposMisiones: Tag,
  parteDiario: CalendarCheck,
}

// Este componente asume que ya es mobile — DashboardShell decide SI
// se monta, consultando useDeviceType() una sola vez ahí arriba. No
// se vuelve a preguntar acá adentro, para no duplicar el hook ni
// generar un parpadeo propio.
export default function BarraNavegacionInferior({ rol, permisos, esCargoDeCascada }) {
  const pathname = usePathname()
  const [mostrarMas, setMostrarMas] = useState(false)

  // Mismo hook que ya usa Navbar.js — ver useBadgesDashboard.js. Antes
  // esto era 4 fetches propios, duplicados con los del sidebar; ahora
  // es una sola fuente para los dos.
  const { acusesParaMi, pendientesParaMi, postVueloParaMi, alertasSicem } = useBadgesDashboard(permisos, esCargoDeCascada)

  const BADGES = {
    escalas: esCargoDeCascada ? pendientesParaMi : acusesParaMi,
    postVuelo: postVueloParaMi,
    sicem: alertasSicem,
  }

  const { fijos, resto } = armarNavegacionMobile(permisos, esCargoDeCascada)
  const esAdmin = ROLES_ADMIN.includes(rol)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900 border-t border-gray-700 flex items-stretch"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {fijos.map((item) => {
          const Icono = ICONOS[item.iconKey]
          const badge = BADGES[item.iconKey] || 0
          const activo = pathname === item.ruta || pathname.startsWith(item.ruta + "/")
          return (
            <Link
              key={item.modulo}
              href={item.ruta}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${
                activo ? "text-white" : "text-gray-400"
              }`}
            >
              <Icono size={20} />
              {badge > 0 && (
                <span className="absolute top-1 right-[22%] bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* "Más" es siempre fijo — a diferencia de los 4 anteriores,
            que dependen de permisos, acá siempre hay algo adentro:
            como mínimo Cambiar contraseña y Cerrar sesión, que todo
            usuario logueado tiene, sin importar su rol. */}
        <button
          onClick={() => setMostrarMas(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-gray-400"
        >
          <MoreHorizontal size={20} />
          <span>Más</span>
        </button>
      </nav>

      {mostrarMas && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMostrarMas(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-y-auto"
            style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Más opciones</h3>
              <button onClick={() => setMostrarMas(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            {resto.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-4">
                {resto.map((item) => {
                  const Icono = ICONOS[item.iconKey]
                  return (
                    <Link
                      key={item.modulo}
                      href={item.ruta}
                      onClick={() => setMostrarMas(false)}
                      className="flex flex-col items-center gap-1 text-gray-600 text-xs"
                    >
                      <div className="bg-gray-100 rounded-full p-3">
                        <Icono size={20} />
                      </div>
                      <span className="text-center">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            )}

            {/* Cuenta/administración — mismo contenido que hoy vive
                en el pie de Navbar.js, para que mobile no se quede
                sin estas acciones. */}
            <div className={resto.length > 0 ? "border-t border-gray-100 pt-3" : ""}>
              {esAdmin && (
                <>
                  <Link
                    href="/dashboard/administracion/permisos"
                    onClick={() => setMostrarMas(false)}
                    className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    <Lock size={18} className="text-gray-400" />
                    Gestión de Permisos
                  </Link>
                  <Link
                    href="/dashboard/administracion/log-intentos"
                    onClick={() => setMostrarMas(false)}
                    className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
                  >
                    <ScrollText size={18} className="text-gray-400" />
                    Registro de Accesos
                  </Link>
                </>
              )}
              <Link
                href="/dashboard/perfil"
                onClick={() => setMostrarMas(false)}
                className="flex items-center gap-3 px-2 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-md"
              >
                <KeyRound size={18} className="text-gray-400" />
                Cambiar contraseña
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-3 px-2 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-md w-full text-left"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}