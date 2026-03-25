"use client"

import { useState, useEffect } from "react"

export default function TiposMisionesForm({ tipoMision, onGuardado, onCerrar }) {

  // Si viene tipoMision con datos, estamos en modo edición
  // Si no viene nada, estamos en modo creación
  const modoEdicion = !!tipoMision

  // Estados del formulario
  // Si es edición, precargamos los valores existentes
  // Si es creación, arrancamos con todo vacío
  const [codigo, setCodigo]           = useState(tipoMision?.codigo      || "")
  const [nombre, setNombre]           = useState(tipoMision?.nombre      || "")
  const [categoria, setCategoria]     = useState(tipoMision?.categoria   || "")
  const [descripcion, setDescripcion] = useState(tipoMision?.descripcion || "")
  const [cargando, setCargando]       = useState(false)
  const [error, setError]             = useState("")

  // Listener de teclado — Escape para cerrar, Enter para guardar
  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === "Escape") onCerrar()
      if (e.key === "Enter")  handleGuardar()
    }

    document.addEventListener("keydown", manejarTecla)

    // Función de limpieza — elimina el listener cuando el modal se cierra
    return () => {
      document.removeEventListener("keydown", manejarTecla)
    }
  }, [codigo, nombre, categoria, descripcion])
  // ↑ Estas dependencias son importantes — le dicen al useEffect que
  // se actualice cuando cambian los valores del form, así el Enter
  // siempre guarda los datos más recientes

  const handleGuardar = async () => {
    // Evitar doble envío si ya está cargando
    if (cargando) return

    setCargando(true)
    setError("")

    // Definimos el método y la URL según si es creación o edición
    const metodo = modoEdicion ? "PUT" : "POST"
    const url    = modoEdicion
      ? `/api/tipos-misiones/${tipoMision.id}`
      : "/api/tipos-misiones"

    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigo, nombre, categoria, descripcion })
    })

    const datos = await respuesta.json()

    if (!respuesta.ok) {
      // El servidor devolvió un error — lo mostramos en pantalla
      setError(datos.error || "Ocurrió un error inesperado")
      setCargando(false)
      return
    }

    // Todo salió bien — avisamos al componente padre
    onGuardado()
  }

  return (
    // Fondo oscuro detrás del modal
    // Al hacer clic fuera del modal, se cierra
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onCerrar}
    >
      {/* Contenido del modal */}
      {/* stopPropagation evita que al hacer clic dentro del modal se cierre */}
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            {modoEdicion ? "Editar Tipo de Misión" : "Nuevo Tipo de Misión"}
          </h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Campo Código */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: VMIL"
            maxLength={10}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Se convierte a mayúsculas automáticamente
          </p>
        </div>

        {/* Campo Nombre */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Vuelos Militares"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Campo Categoría */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccionar categoría</option>
            <option value="MILITAR">Militar</option>
            <option value="INSTITUCIONAL">Institucional</option>
          </select>
        </div>

        {/* Campo Descripción */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
            <span className="text-gray-400 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción adicional..."
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando}
            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {cargando ? "Guardando..." : "Guardar"}
          </button>
        </div>

        {/* Ayuda de teclado */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Presioná <kbd className="bg-gray-100 px-1 rounded">Enter</kbd> para guardar
          o <kbd className="bg-gray-100 px-1 rounded">Esc</kbd> para cancelar
        </p>

      </div>
    </div>
  )
}