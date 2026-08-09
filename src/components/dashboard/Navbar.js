"use client"

import { signOut } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import {
  Home, Tag, Plane, Users, CalendarCheck, CalendarDays, PlusCircle,
  ShieldCheck, UserCog, ClipboardList, FileText, BarChart3, Wrench, Lock,
  ScrollText, Menu, LogOut, KeyRound, PlaneLanding,
} from "lucide-react"
import { ROLES_ADMIN } from "@/lib/autorizacion"

const modulosAntes = [
  { nombre: "Inicio",            ruta: "/dashboard",                Icono: Home  },
  { nombre: "Tipos de Misiones", ruta: "/dashboard/tipos-misiones", Icono: Tag,   modulo: "TIPOS_MISIONES" },
  { nombre: "Aeronaves",         ruta: "/dashboard/aeronaves",      Icono: Plane, modulo: "AERONAVES" },
  { nombre: "Personas",          ruta: "/dashboard/personas",       Icono: Users, modulo: "PERSONAS" },
]

const modulosDespues = [
  { nombre: "Manifiesto", ruta: "/dashboard/manifiesto", Icono: FileText,  modulo: "MANIFIESTO" },
  { nombre: "Informes",   ruta: "/dashboard/informes",   Icono: BarChart3, modulo: "INFORMES" },
  { nombre: "SICEM",      ruta: "/dashboard/sicem",      Icono: Wrench,    modulo: "SICEM" },
]

function ItemModulo({ nombre, ruta, Icono, activo, colapsado }) {
  if (colapsado) {
    return (
      <Link
        href={ruta}
        title={nombre}
        className={`flex items-center justify-center py-2.5 rounded-md transition-colors ${
          activo ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }`}
      >
        <Icono size={18} />
      </Link>
    )
  }
  return (
    <Link
      href={ruta}
      className={`flex items-center gap-3 px-4 py-2 rounded-md text-sm transition-colors ${
        activo ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
    >
      <Icono size={18} className="shrink-0" />
      <span>{nombre}</span>
    </Link>
  )
}

function ItemModuloConBadge({ nombre, ruta, Icono, activo, badge, colapsado }) {
  if (colapsado) {
    return (
      <Link
        href={ruta}
        title={badge > 0 ? `${nombre} (${badge})` : nombre}
        className={`relative flex items-center justify-center py-2.5 rounded-md transition-colors ${
          activo ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
        }`}
      >
        <Icono size={18} />
        {badge > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />}
      </Link>
    )
  }
  return (
    <Link
      href={ruta}
      className={`flex items-center justify-between px-4 py-2 rounded-md text-sm transition-colors ${
        activo ? "bg-blue-600 text-white font-medium" : "text-gray-300 hover:bg-gray-700 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icono size={18} className="shrink-0" />
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

function SubItemEscalas({ nombre, ruta, Icono, activo, badge, colapsado }) {
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

export default function Navbar({ nombre, apellido, rol, permisos, esCargoDeCascada, colapsado, onToggleColapsado }) {
  const pathname = usePathname()
  const [pendientesParaMi, setPendientesParaMi] = useState(0)
  const [postVueloParaMi, setPostVueloParaMi] = useState(0)
  const [acusesParaMi, setAcusesParaMi] = useState(0)

  const dentroDeEscalas = pathname.startsWith("/dashboard/escalas")
  const vePersonas = permisos?.PERSONAS?.puede_ver
  const veEscalas  = permisos?.ESCALAS?.puede_ver

  const modulosAntesVisibles = modulosAntes.filter(
    (m) => !m.modulo || permisos?.[m.modulo]?.puede_ver
  )
  const modulosDespuesVisibles = modulosDespues.filter(
    (m) => !m.modulo || permisos?.[m.modulo]?.puede_ver
  )

  useEffect(() => {
    if (!esCargoDeCascada) return
    fetch("/api/escalas/pendientes-autorizar", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPendientesParaMi(data?.podesActuar ? data.escalas.length : 0))
      .catch(() => {})
  }, [pathname, esCargoDeCascada])

  useEffect(() => {
    fetch("/api/post-vuelo/pendientes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setPostVueloParaMi(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    fetch("/api/acuses/pendientes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAcusesParaMi(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [pathname])

  return (
    <div
      className={`flex h-screen flex-col bg-gray-900 text-white fixed left-0 top-0 transition-all duration-200 ${
        colapsado ? "w-16" : "w-64"
      }`}
    >

      <div className={`border-b border-gray-700 flex items-center ${colapsado ? "justify-center py-4" : "justify-between px-4 py-4"}`}>
        {!colapsado && (
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-blue-600 rounded-md p-1.5 shrink-0">
              <Plane size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white truncate">Sistema GTAP</h1>
              <p className="text-[11px] text-gray-400 truncate">Grupo de Transporte Aéreo Presidencial</p>
            </div>
          </div>
        )}
        <button
          onClick={onToggleColapsado}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
          className="text-gray-300 hover:text-white hover:bg-gray-800 rounded-md p-1.5 transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {modulosAntesVisibles.map((modulo) => (
            <li key={modulo.ruta}>
              <ItemModulo {...modulo} activo={pathname === modulo.ruta} colapsado={colapsado} />
            </li>
          ))}

          {vePersonas && (
            <li>
              <ItemModulo
                nombre="Parte Diario"
                ruta="/dashboard/parte-diario"
                Icono={CalendarCheck}
                activo={pathname === "/dashboard/parte-diario"}
                colapsado={colapsado}
              />
            </li>
          )}

          {veEscalas && (
            <li>
              {colapsado ? (
                <Link
                  href="/dashboard/escalas"
                  title={acusesParaMi > 0 ? `Escalas (${acusesParaMi} por acusar recibo)` : "Escalas"}
                  className={`relative flex items-center justify-center py-2.5 rounded-md transition-colors ${
                    dentroDeEscalas ? "text-white bg-gray-800" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <CalendarDays size={18} />
                  {acusesParaMi > 0 && <span className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full" />}
                </Link>
              ) : (
                <Link
                  href="/dashboard/escalas"
                  className={`flex items-center justify-between px-4 py-2 rounded-md text-sm transition-colors ${
                    dentroDeEscalas ? "text-white font-medium" : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <CalendarDays size={18} className="shrink-0" />
                    Escalas
                  </span>
                  {/* Indicador general — visible aunque el submenú esté
                      colapsado (por ejemplo, navegando en otra sección
                      del sistema). No dice DÓNDE adentro de Escalas hay
                      que ir — para eso está el badge de Agenda, abajo. */}
                  {acusesParaMi > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {acusesParaMi}
                    </span>
                  )}
                </Link>
              )}

              {dentroDeEscalas && (
                <ul className="mt-1 space-y-0.5">
                  <li>
                    {/* FIX: ahora también marca acá — mismo patrón que ya
                        usa "Pendientes de autorizar" con el suyo. Así,
                        una vez adentro de Escalas, queda claro que Agenda
                        es el lugar puntual para resolver el acuse. */}
                    <SubItemEscalas nombre="Agenda" ruta="/dashboard/escalas" Icono={CalendarDays}
                      activo={pathname === "/dashboard/escalas"} badge={acusesParaMi} colapsado={colapsado} />
                  </li>
                  <li>
                    <SubItemEscalas nombre="Nueva escala" ruta="/dashboard/escalas/nueva" Icono={PlusCircle}
                      activo={pathname === "/dashboard/escalas/nueva"} colapsado={colapsado} />
                  </li>
                  <li>
                    <SubItemEscalas nombre="Gestión" ruta="/dashboard/escalas/historial" Icono={ClipboardList}
                      activo={pathname === "/dashboard/escalas/historial"} colapsado={colapsado} />
                  </li>
                  {esCargoDeCascada && (
                    <li>
                      <SubItemEscalas nombre="Pendientes de autorizar" ruta="/dashboard/escalas/pendientes-autorizar" Icono={ShieldCheck}
                        activo={pathname === "/dashboard/escalas/pendientes-autorizar"} badge={pendientesParaMi} colapsado={colapsado} />
                    </li>
                  )}
                  {ROLES_ADMIN.includes(rol) && (
                    <li>
                      <SubItemEscalas nombre="Cargos de Autorización" ruta="/dashboard/escalas/cargos-autorizacion" Icono={UserCog}
                        activo={pathname === "/dashboard/escalas/cargos-autorizacion"} colapsado={colapsado} />
                    </li>
                  )}
                </ul>
              )}
            </li>
          )}

          <li>
            <ItemModuloConBadge
              nombre="Post-Vuelo"
              ruta="/dashboard/post-vuelo"
              Icono={PlaneLanding}
              activo={pathname === "/dashboard/post-vuelo"}
              badge={postVueloParaMi}
              colapsado={colapsado}
            />
          </li>

          {modulosDespuesVisibles.map((modulo) => (
            <li key={modulo.ruta}>
              <ItemModulo {...modulo} activo={pathname === modulo.ruta} colapsado={colapsado} />
            </li>
          ))}
        </ul>

        {ROLES_ADMIN.includes(rol) && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {!colapsado && (
              <p className="text-xs font-semibold uppercase text-gray-500 px-4 mb-2">Administración</p>
            )}
            <ul className="space-y-1">
              <li>
                <ItemModulo nombre="Gestión de Permisos" ruta="/dashboard/administracion/permisos" Icono={Lock}
                  activo={pathname === "/dashboard/administracion/permisos"} colapsado={colapsado} />
              </li>
              <li>
                <ItemModulo nombre="Registro de Accesos" ruta="/dashboard/administracion/log-intentos" Icono={ScrollText}
                  activo={pathname === "/dashboard/administracion/log-intentos"} colapsado={colapsado} />
              </li>
            </ul>
          </div>
        )}
      </nav>

      <div className={`border-t border-gray-700 ${colapsado ? "py-3 flex flex-col items-center gap-3" : "px-6 py-4 space-y-1"}`}>
        {!colapsado && (
          <>
            <p className="text-sm font-semibold text-white">{nombre} {apellido}</p>
            <p className="text-sm font-medium text-blue-400">{rol}</p>
          </>
        )}
        <div className={colapsado ? "flex flex-col gap-3" : "pt-1 space-y-1"}>
          <Link
            href="/dashboard/perfil"
            title={colapsado ? "Cambiar contraseña" : undefined}
            className={`text-gray-400 hover:text-white transition-colors ${colapsado ? "flex justify-center" : "block text-xs"}`}
          >
            {colapsado ? <KeyRound size={16} /> : "Cambiar contraseña"}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={colapsado ? "Cerrar sesión" : undefined}
            className={`text-red-400 hover:text-red-300 transition-colors ${colapsado ? "flex justify-center" : "w-full text-xs text-left"}`}
          >
            {colapsado ? <LogOut size={16} /> : "Cerrar sesión"}
          </button>
        </div>
      </div>

    </div>
  )
}