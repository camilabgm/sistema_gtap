"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ROLES_ADMIN } from "@/lib/autorizacion"

const modulos = [
  { nombre: "Inicio",            ruta: "/dashboard" },
  { nombre: "Tipos de Misiones", ruta: "/dashboard/tipos-misiones" },
  { nombre: "Aeronaves",         ruta: "/dashboard/aeronaves" },
  { nombre: "Personas",          ruta: "/dashboard/personas" },
  { nombre: "Escalas",           ruta: "/dashboard/escalas" },
  { nombre: "Manifiesto",        ruta: "/dashboard/manifiesto" },
  { nombre: "Informes",          ruta: "/dashboard/informes" },
  { nombre: "SICEM",             ruta: "/dashboard/sicem" },
]

export default function Navbar({ nombre, apellido, rol }) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white w-64 fixed left-0 top-0">

      {/* Logo y título */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Sistema GTAP</h1>
        <p className="text-xs text-gray-400 mt-1">
          Grupo de Transporte Aéreo Presidencial
        </p>
      </div>

      {/* Menú de módulos */}
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {modulos.map((modulo) => {
            const estaActivo = pathname === modulo.ruta
            return (
              <li key={modulo.ruta}>
                <Link
                  href={modulo.ruta}
                  className={`
                    block px-4 py-2 rounded-md text-sm transition-colors
                    ${estaActivo
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                    }
                  `}
                >
                  {modulo.nombre}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Sección administrativa — Comandante y Jefe de Operaciones */}
        {ROLES_ADMIN.includes(rol) && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs font-semibold uppercase text-gray-500 px-4 mb-2">
              Administración
            </p>
            <Link
              href="/dashboard/administracion/permisos"
              className={`
                block px-4 py-2 rounded-md text-sm transition-colors
                ${pathname === "/dashboard/administracion/permisos"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }
              `}
            >
              Gestión de Permisos
            </Link>
            <Link
              href="/dashboard/administracion/log-intentos"
              className={`
                block px-4 py-2 rounded-md text-sm transition-colors
                ${pathname === "/dashboard/administracion/log-intentos"
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }
              `}
            >
              Registro de Accesos
            </Link>
          </div>
        )}
      </nav>

      {/* Datos del usuario */}
      <div className="px-6 py-4 border-t border-gray-700 space-y-1">
        <p className="text-sm font-semibold text-white">
          {nombre} {apellido}
        </p>
        <p className="text-sm font-medium text-blue-400">
          {rol}
        </p>
        <div className="pt-1 space-y-1">
          <Link
            href="/dashboard/perfil"
            className="block text-xs text-gray-400 hover:text-white transition-colors"
          >
            Cambiar contraseña
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-xs text-red-400 hover:text-red-300 text-left transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

    </div>
  )
}