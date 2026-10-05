"use client"

// src/components/administracion/TablaLogIntentos.js
//
// CAMBIO (rama fix/responsive-listados):
//   - El título y el subtítulo se mudan de page.js a este componente,
//     dentro del EncabezadoPagina compartido. Antes page.js dibujaba el
//     título y este componente dibujaba el "Volver a Inicio" DEBAJO, así
//     que en celular quedaba al revés que en el resto de los módulos
//     (título arriba, "Volver" abajo). Ahora el orden es el de siempre.
//   - El buscador ocupa todo el ancho en celular (antes tenía w-64 fijo,
//     256px, que en una pantalla de 320 dejaba el select colgando).
//   - La tabla mantiene su desplazamiento horizontal propio
//     (overflow-x-auto): 4 columnas que se deslizan dentro de su tarjeta.

import { useState } from "react"
import { Search } from "lucide-react"
import { formatearFechaHora } from "@/lib/fechaHora"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"

const COLORES_RESULTADO = {
  EXITOSO:               "bg-green-100 text-green-800",
  USUARIO_NO_EXISTE:     "bg-red-100 text-red-800",
  CUENTA_INACTIVA:       "bg-yellow-100 text-yellow-800",
  CREDENCIALES_INVALIDAS:"bg-red-100 text-red-800",
  CUENTA_BLOQUEADA:      "bg-orange-100 text-orange-800",
}

const ETIQUETAS_RESULTADO = {
  EXITOSO:               "Exitoso",
  USUARIO_NO_EXISTE:     "Usuario no existe",
  CUENTA_INACTIVA:       "Cuenta inactiva",
  CREDENCIALES_INVALIDAS:"Credenciales inválidas",
  CUENTA_BLOQUEADA:      "Cuenta bloqueada",
}

export default function TablaLogIntentos({ intentos }) {
  const [filtroResultado, setFiltroResultado] = useState("TODOS")
  const [busquedaUsuario, setBusquedaUsuario] = useState("")

  const intentosFiltrados = intentos.filter((intento) => {
    const cumpleResultado =
      filtroResultado === "TODOS" || intento.resultado === filtroResultado
    const cumpleUsuario =
      intento.username.toLowerCase().includes(busquedaUsuario.toLowerCase())
    return cumpleResultado && cumpleUsuario
  })

  return (
    <div>
      <EncabezadoPagina
        volverAInicio
        titulo="Registro de Intentos de Login"
        subtitulo="Historial de los últimos 200 intentos de acceso al sistema"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busquedaUsuario}
              onChange={(e) => setBusquedaUsuario(e.target.value)}
              placeholder="Buscar por usuario"
              className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos los resultados</option>
            <option value="EXITOSO">Exitoso</option>
            <option value="CREDENCIALES_INVALIDAS">Credenciales inválidas</option>
            <option value="CUENTA_BLOQUEADA">Cuenta bloqueada</option>
            <option value="USUARIO_NO_EXISTE">Usuario no existe</option>
            <option value="CUENTA_INACTIVA">Cuenta inactiva</option>
          </select>
        </div>
      </EncabezadoPagina>

      <p className="text-sm text-gray-500 mb-2">
        Mostrando {intentosFiltrados.length} de {intentos.length} registros
      </p>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs whitespace-nowrap">
                Fecha y hora
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                Resultado
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {intentosFiltrados.map((intento) => (
              <tr key={intento.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {formatearFechaHora(intento.created_at)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {intento.username}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${COLORES_RESULTADO[intento.resultado]}`}
                  >
                    {ETIQUETAS_RESULTADO[intento.resultado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                  {intento.ip}
                </td>
              </tr>
            ))}
            {intentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No se encontraron registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}