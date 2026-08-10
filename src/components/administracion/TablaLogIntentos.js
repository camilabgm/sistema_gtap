"use client"
import { useState } from "react"
import { formatearFechaHora } from "@/lib/fechaHora"

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
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filtrar por resultado
          </label>
          <select
            value={filtroResultado}
            onChange={(e) => setFiltroResultado(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TODOS">Todos</option>
            <option value="EXITOSO">Exitoso</option>
            <option value="CREDENCIALES_INVALIDAS">Credenciales inválidas</option>
            <option value="CUENTA_BLOQUEADA">Cuenta bloqueada</option>
            <option value="USUARIO_NO_EXISTE">Usuario no existe</option>
            <option value="CUENTA_INACTIVA">Cuenta inactiva</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar por usuario
          </label>
          <input
            type="text"
            value={busquedaUsuario}
            onChange={(e) => setBusquedaUsuario(e.target.value)}
            placeholder="Escribí un nombre de usuario..."
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-2">
        Mostrando {intentosFiltrados.length} de {intentos.length} registros
      </p>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Fecha y Hora
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Resultado
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {intentosFiltrados.map((intento) => (
              <tr key={intento.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-600">
                  {formatearFechaHora(intento.created_at)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {intento.username}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${COLORES_RESULTADO[intento.resultado]}`}
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