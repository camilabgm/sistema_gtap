"use client"

import { useState } from "react"

const MODULOS = [
  { key: "PERSONAS",       label: "Personas" },
  { key: "AERONAVES",      label: "Aeronaves" },
  { key: "TIPOS_MISIONES", label: "Tipos de Misiones" },
  { key: "ESCALAS",        label: "Escalas de Vuelo" },
  { key: "POST_VUELO",     label: "Post-Vuelo" },
  { key: "MANIFIESTO",     label: "Manifiesto" },
  { key: "SICEM",          label: "SICEM" },
  { key: "INFORMES",       label: "Informes" },
]

const ACCIONES = [
  { key: "puede_ver",      label: "Ver" },
  { key: "puede_crear",    label: "Crear" },
  { key: "puede_editar",   label: "Editar" },
  { key: "puede_eliminar", label: "Eliminar" },
  { key: "puede_reportes", label: "Reportes" },
]

function buildPermisoInicial(permisos_rol) {
  const mapa = {}
  for (const modulo of MODULOS) {
    const encontrado = permisos_rol.find((p) => p.modulo === modulo.key)
    mapa[modulo.key] = {
      puede_ver:      encontrado?.puede_ver      ?? false,
      puede_crear:    encontrado?.puede_crear    ?? false,
      puede_editar:   encontrado?.puede_editar   ?? false,
      puede_eliminar: encontrado?.puede_eliminar ?? false,
      puede_reportes: encontrado?.puede_reportes ?? false,
    }
  }
  return mapa
}

export default function PermisosRolTable({ roles }) {
  const [rolSeleccionado, setRolSeleccionado] = useState(roles[0])
  const [permisos, setPermisos] = useState(
    () => buildPermisoInicial(roles[0].permisos_rol)
  )
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje]     = useState(null)

  function seleccionarRol(rol) {
    setRolSeleccionado(rol)
    setPermisos(buildPermisoInicial(rol.permisos_rol))
    setMensaje(null)
  }

  function togglePermiso(modulo, accion) {
    setPermisos((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [accion]: !prev[modulo][accion],
      },
    }))
  }

  async function guardar() {
    setGuardando(true)
    setMensaje(null)

    const permisosArray = MODULOS.map((m) => ({
      modulo: m.key,
      ...permisos[m.key],
    }))

    try {
      const res = await fetch("/api/permisos/rol", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          rol_id:   rolSeleccionado.id,
          permisos: permisosArray,
        }),
      })

      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Permisos guardados correctamente. Los usuarios afectados deberán volver a iniciar sesión." })
      } else {
        setMensaje({ tipo: "error", texto: "Ocurrió un error al guardar. Intentá de nuevo." })
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión. Intentá de nuevo." })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex gap-6">

      {/* Selector de roles */}
      <div className="w-56 shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-semibold uppercase text-gray-400 mb-2 px-1">
            Roles
          </p>
          <ul className="space-y-1">
            {roles.map((rol) => (
              <li key={rol.id}>
                <button
                  onClick={() => seleccionarRol(rol)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    rolSeleccionado.id === rol.id
                      ? "bg-blue-600 text-white font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {rol.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tabla de permisos */}
      <div className="flex-1">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{rolSeleccionado.nombre}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{rolSeleccionado.descripcion}</p>
            </div>
            <button
              onClick={guardar}
              disabled={guardando}
              className="h-9 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {/* Mensaje de resultado */}
          {mensaje && (
            <div className={`px-6 py-3 text-sm ${
              mensaje.tipo === "ok"
                ? "bg-green-50 text-green-700 border-b border-green-100"
                : "bg-red-50 text-red-700 border-b border-red-100"
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs w-48">
                    Módulo
                  </th>
                  {ACCIONES.map((a) => (
                    <th key={a.key} className="text-center px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULOS.map((modulo) => (
                  <tr key={modulo.key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-700">
                      {modulo.label}
                    </td>
                    {ACCIONES.map((accion) => (
                      <td key={accion.key} className="text-center px-4 py-3">
                        <input
                          type="checkbox"
                          checked={permisos[modulo.key]?.[accion.key] ?? false}
                          onChange={() => togglePermiso(modulo.key, accion.key)}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}