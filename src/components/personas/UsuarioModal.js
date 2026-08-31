"use client"
// src/components/personas/UsuarioModal.js

import { useState, useEffect } from "react"
import { validarContrasena } from "@/lib/validarContrasena"

export default function UsuarioModal({ persona, onGuardado, onCerrar }) {

  const modoEdicion = !!persona.usuario

  const [roles,    setRoles]    = useState([])
  const [form,     setForm]     = useState({
    username: persona.usuario?.username || persona.nro_documento || "",
    password: "",
    rol_id:   persona.usuario?.rol_id   || "",
    rol_secundario_id:      persona.usuario?.rol_secundario_id ? String(persona.usuario.rol_secundario_id) : "",
    rol_secundario_combina: persona.usuario?.rol_secundario_combina ?? true,
  })
  const [cargando, setCargando] = useState(false)
  const [error,    setError]    = useState("")

  // Valores originales, para detectar si el rol secundario cambió y
  // armar el mensaje de confirmación correcto — no comparamos contra
  // form directamente porque form ya tiene el valor nuevo tipeado.
  const rolSecundarioOriginalId = persona.usuario?.rol_secundario_id || null
  const combinaOriginal         = persona.usuario?.rol_secundario_combina ?? true

  useEffect(() => {
    async function cargarRoles() {
      const res  = await fetch("/api/roles")
      const data = await res.json()
      // Guarda TODOS los roles sin filtrar acá — de acá se derivan
      // rolesParaPrincipal y rolSupervisorSemana, más abajo.
      setRoles(data)
    }
    cargarRoles()
  }, [])

  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar()
      if (e.key === "Enter")  handleGuardar()
    }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [form])

  // Detectar si se está seleccionando el rol Comandante
  const rolSeleccionado       = roles.find((r) => r.id === Number(form.rol_id))
  const asignandoComandante   = rolSeleccionado?.nombre === "Comandante"

  // Rol principal: sin Comandante si esta persona ya lo es (evita
  // duplicar mando sin una transferencia explícita), y sin Supervisor
  // de Semana SIEMPRE — es un rol secundario rotativo, nunca tiene
  // sentido como rol principal de nadie.
  const rolComandante          = roles.find((r) => r.nombre === "Comandante")
  const estaPersonaEsComandante = persona.usuario?.rol_id === rolComandante?.id
  const rolesParaPrincipal = roles.filter((r) => {
    if (r.nombre === "Comandante" && estaPersonaEsComandante) return false
    if (r.nombre === "Supervisor de Semana") return false
    return true
  })

  // Rol secundario: SIMPLIFICADO a propósito. Hoy en la operación real
  // del GTAP, Supervisor de Semana es el único rol que rota — no hay
  // ningún otro caso confirmado. Mostrar los 12 roles enteros en un
  // dropdown era más fuente de error (asignar por accidente algo sin
  // sentido operativo, ej. "Estadística" a un Piloto) que utilidad
  // real. Si en el futuro aparece otro rol rotativo genuino, esto se
  // vuelve a abrir a una lista — por ahora, un solo checkbox.
  const rolSupervisorSemana = roles.find((r) => r.nombre === "Supervisor de Semana")

  // Arma el texto de confirmación según qué cambió puntualmente en el
  // rol secundario — tres casos (activar, sacar, cambiar el checkbox
  // de combinar), cada uno con su propio aviso de qué va a pasar con
  // los permisos. Ya no existe un caso "cambiar de un rol secundario a
  // otro" — al haber una sola opción posible, ese caso no puede pasar.
  function mensajeConfirmacionRolSecundario() {
    const nuevoId = form.rol_secundario_id ? Number(form.rol_secundario_id) : null
    const nombreRolBase = rolSeleccionado?.nombre || "su rol actual"
    const nombreDestino = persona.grado + " " + persona.apellido + ", " + persona.nombre

    // Caso 1: se está sacando el turno de Supervisor de Semana
    if (!nuevoId && rolSecundarioOriginalId) {
      return `¿Confirmás sacarle el turno de Supervisor de Semana a ${nombreDestino}? Vuelve a tener únicamente los permisos de ${nombreRolBase}.`
    }

    // Caso 2: se está activando (antes no lo tenía)
    if (nuevoId && !rolSecundarioOriginalId) {
      return form.rol_secundario_combina
        ? `¿Confirmás activar a ${nombreDestino} como Supervisor de Semana? Se van a SUMAR esos permisos a los que ya tiene como ${nombreRolBase} — no pierde nada de lo que ya tiene.`
        : `¿Confirmás activar a ${nombreDestino} como Supervisor de Semana? Mientras esté activo, sus permisos van a ser ÚNICAMENTE los de Supervisor de Semana — no los de ${nombreRolBase} mientras dure.`
    }

    // Caso 3: ya lo tenía activo, pero cambió el checkbox de combinar
    if (nuevoId && nuevoId === rolSecundarioOriginalId && form.rol_secundario_combina !== combinaOriginal) {
      return form.rol_secundario_combina
        ? `¿Confirmás el cambio? A partir de ahora, los permisos de Supervisor de Semana se van a SUMAR a los de ${nombreRolBase} — antes lo reemplazaban por completo mientras estaba activo.`
        : `¿Confirmás el cambio? A partir de ahora, mientras el turno de Supervisor de Semana esté activo, sus permisos van a ser ÚNICAMENTE esos — dejan de sumarse a los de ${nombreRolBase}.`
    }

    return null // no cambió nada del rol secundario
  }

  async function handleGuardar() {
    if (cargando) return

    // Confirmación al dar acceso por primera vez
    if (!modoEdicion) {
      const confirmar = window.confirm(
        `¿Confirmás dar acceso al sistema a ${persona.grado} ${persona.apellido}, ${persona.nombre}?`
      )
      if (!confirmar) return
    }

    // Confirmación extra al asignar el rol Comandante
    if (asignandoComandante) {
      const confirmar = window.confirm(
        `Estás por asignar el rol de Comandante a ${persona.grado} ${persona.apellido}, ${persona.nombre}.\n\nEl Comandante actual debe tener otro rol asignado antes de confirmar este cambio.\n\n¿Confirmás?`
      )
      if (!confirmar) return
    }

    // Confirmación del rol secundario — solo si algo de eso cambió
    const mensajeRolSecundario = mensajeConfirmacionRolSecundario()
    if (mensajeRolSecundario) {
      const confirmar = window.confirm(mensajeRolSecundario)
      if (!confirmar) return
    }

    setCargando(true)
    setError("")

    if (!modoEdicion && !form.password) {
      setError("La contraseña es obligatoria")
      setCargando(false)
      return
    }

    if (form.password) {
      const { valida, errores } = validarContrasena(form.password)
      if (!valida) {
        setError(errores.join(". ") + ".")
        setCargando(false)
        return
      }
    }

    const body = {
      ...form,
      rol_secundario_id: form.rol_secundario_id ? Number(form.rol_secundario_id) : null,
    }

    const respuesta = modoEdicion
      ? await fetch(`/api/usuarios/${persona.usuario.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(body),
        })
      : await fetch("/api/usuarios", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ ...body, persona_id: persona.id }),
        })

    const datos = await respuesta.json()

    if (!respuesta.ok) {
      setError(datos.error || "Ocurrió un error inesperado")
      setCargando(false)
      return
    }

    onGuardado()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {modoEdicion ? "Editar acceso" : "Dar acceso al sistema"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {persona.grado} {persona.apellido}, {persona.nombre}
            </p>
          </div>
          <button onClick={onCerrar} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="px-6 py-4 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de CI <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Número de CI"
              disabled={modoEdicion}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            {modoEdicion && (
              <p className="text-xs text-gray-400 mt-1">El número de CI no se puede cambiar</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {modoEdicion
                ? "Nueva contraseña (dejar vacío para no cambiar)"
                : "Contraseña"}
              {!modoEdicion && <span className="text-red-500"> *</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={modoEdicion ? "••••••••" : "Mínimo 10 caracteres"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              value={form.rol_id}
              onChange={(e) => setForm({ ...form, rol_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar rol...</option>
              {rolesParaPrincipal.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.nombre}
                </option>
              ))}
            </select>

            {asignandoComandante && (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                ⚠️ Asignar este rol transfiere el mando del GTAP. El Comandante actual debe tener otro rol antes de confirmar.
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!form.rol_secundario_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    rol_secundario_id: e.target.checked && rolSupervisorSemana ? String(rolSupervisorSemana.id) : "",
                  })
                }
                disabled={!rolSupervisorSemana}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
              />
              <span>
                Activar como Supervisor de Semana esta semana
                <span className="block text-xs text-gray-400 mt-0.5">
                  Es el único rol secundario que existe hoy — rota semanalmente entre Técnicos de Vuelo o Jefe de Combustible.
                  {!rolSupervisorSemana && " (no se encontró el rol \"Supervisor de Semana\" en el sistema)"}
                </span>
              </span>
            </label>

            {form.rol_secundario_id && (
              <div className="mt-2">
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.rol_secundario_combina}
                    onChange={(e) => setForm({ ...form, rol_secundario_combina: e.target.checked })}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Combinar permisos con el rol base
                    <span className="block text-xs text-gray-400 mt-0.5">
                      {form.rol_secundario_combina
                        ? "Se suman los permisos de ambos roles mientras esté activo."
                        : "Mientras esté activo, sus permisos van a ser únicamente los del rol secundario."}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : modoEdicion ? "Guardar cambios" : "Dar acceso"}
          </button>
        </div>

      </div>
    </div>
  )
}