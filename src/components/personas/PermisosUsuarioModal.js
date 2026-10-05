"use client"

// src/components/personas/PermisosUsuarioModal.js
//
// La tabla de 7 columnas (Módulo + 5 acciones + Personalizar) vive
// dentro de un modal: tiene su propio contenedor con overflow-x-auto
// para deslizarse de costado en pantallas angostas.
//
// CAMBIO (rama fix/responsive-modales): usa la cáscara compartida
// ModalBase — pantalla completa en celular, "Cancelar" y "Guardar
// permisos" siempre visibles abajo. Este modal no tenía Esc: ahora lo
// tiene, como todos. El mensaje de éxito/error sigue dentro del
// contenido, arriba de la tabla, porque también muestra el aviso verde
// de "Permisos guardados".

import { useState, useEffect } from "react"
import ModalBase from "@/components/shared/ModalBase"

const MODULOS = [
  { key: "PERSONAS",            label: "Personas" },
  { key: "PARTE_DIARIO",        label: "Parte Diario" },
  { key: "AERONAVES",           label: "Aeronaves" },
  { key: "TIPOS_MISIONES",      label: "Tipos de Misiones" },
  { key: "ESCALAS",             label: "Escalas de Vuelo" },
  { key: "POST_VUELO",          label: "Post-Vuelo" },
  { key: "MANIFIESTO",          label: "Manifiesto" },
  { key: "SICEM",               label: "SICEM" },
  { key: "INFORMES",            label: "Informes" },
]

const ACCIONES = [
  { key: "puede_ver",      label: "Ver" },
  { key: "puede_crear",    label: "Crear" },
  { key: "puede_editar",   label: "Editar" },
  { key: "puede_eliminar", label: "Eliminar" },
  { key: "puede_reportes", label: "Reportes" },
]

export default function PermisosUsuarioModal({ persona, onCerrar, onGuardado }) {
  const [datos, setDatos]         = useState(null)
  const [estado, setEstado]       = useState({})   // { modulo: { ...permisos, es_override } }
  const [cargando, setCargando]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje]     = useState(null)

  useEffect(() => {
    async function cargar() {
      const res  = await fetch(`/api/permisos/usuario/${persona.usuario.id}`)
      const data = await res.json()
      setDatos(data)

      // Construimos el estado inicial
      const estadoInicial = {}
      for (const modulo of MODULOS) {
        const delRol      = data.permisos_rol.find((p) => p.modulo === modulo.key)
        const delUsuario  = data.permisos_usuario.find((p) => p.modulo === modulo.key)
        const esOverride  = !!delUsuario
        const base        = delUsuario || delRol || {}

        estadoInicial[modulo.key] = {
          puede_ver:      base.puede_ver      ?? false,
          puede_crear:    base.puede_crear    ?? false,
          puede_editar:   base.puede_editar   ?? false,
          puede_eliminar: base.puede_eliminar ?? false,
          puede_reportes: base.puede_reportes ?? false,
          es_override:    esOverride,
        }
      }

      setEstado(estadoInicial)
      setCargando(false)
    }

    cargar()
  }, [persona.usuario.id])

  function toggleOverride(modulo) {
    setEstado((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        es_override: !prev[modulo].es_override,
      },
    }))
  }

  function togglePermiso(modulo, accion) {
    setEstado((prev) => ({
      ...prev,
      [modulo]: {
        ...prev[modulo],
        [accion]:    !prev[modulo][accion],
        es_override: true,
      },
    }))
  }

  async function guardar() {
    setGuardando(true)
    setMensaje(null)

    const permisos = MODULOS.map((m) => ({
      modulo: m.key,
      ...estado[m.key],
    }))

    try {
      const res = await fetch(`/api/permisos/usuario/${persona.usuario.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ permisos }),
      })

      if (res.ok) {
        setMensaje({ tipo: "ok", texto: "Permisos guardados. El usuario deberá volver a iniciar sesión." })
        setTimeout(() => onGuardado(), 1500)
      } else {
        setMensaje({ tipo: "error", texto: "Error al guardar. Intentá de nuevo." })
      }
    } catch {
      setMensaje({ tipo: "error", texto: "Error de conexión." })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ModalBase
      titulo="Permisos individuales"
      subtitulo={
        <>
          {persona.apellido}, {persona.nombre}
          {datos && (
            <span className="ml-2 text-xs text-blue-600">
              Rol base: {datos.rol_nombre}
            </span>
          )}
        </>
      }
      onCerrar={onCerrar}
      ancho="4xl"
      pie={<>
        <button
          onClick={onCerrar}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando || cargando}
          className="px-4 py-2 text-sm bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {guardando ? "Guardando..." : "Guardar permisos"}
        </button>
      </>}
    >
      {cargando ? (
        <p className="text-center text-gray-400 py-8">Cargando permisos...</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-4">
            Las filas marcadas como <strong>Personalizar</strong> reemplazan los permisos del rol para este usuario.
            Las filas sin personalizar usan los permisos del rol base.
          </p>

          {mensaje && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              mensaje.tipo === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}>
              {mensaje.texto}
            </div>
          )}

          {/* Contenedor propio con scroll horizontal — una tabla de 7
              columnas necesita su propia salida en pantallas angostas,
              en vez de desbordar el modal. */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 whitespace-nowrap">Módulo</th>
                  {ACCIONES.map((a) => (
                    <th key={a.key} className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">
                      {a.label}
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 font-medium text-gray-500 whitespace-nowrap">Personalizar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {MODULOS.map((modulo) => {
                  const s          = estado[modulo.key] || {}
                  const esOverride = s.es_override

                  return (
                    <tr
                      key={modulo.key}
                      className={`transition-colors ${
                        esOverride ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                        {modulo.label}
                        {esOverride && (
                          <span className="ml-2 text-xs text-blue-500 font-normal">
                            personalizado
                          </span>
                        )}
                      </td>
                      {ACCIONES.map((accion) => (
                        <td key={accion.key} className="text-center px-3 py-3">
                          <input
                            type="checkbox"
                            checked={s[accion.key] ?? false}
                            onChange={() => togglePermiso(modulo.key, accion.key)}
                            disabled={!esOverride}
                            className="w-4 h-4 accent-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                          />
                        </td>
                      ))}
                      <td className="text-center px-3 py-3">
                        <input
                          type="checkbox"
                          checked={esOverride}
                          onChange={() => toggleOverride(modulo.key)}
                          className="w-4 h-4 accent-purple-600 cursor-pointer"
                          title="Activar para personalizar los permisos de este módulo"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </ModalBase>
  )
}