"use client"

// src/components/shared/ModalBase.js
//
// "Cáscara" común de todos los modales del sistema (formularios y
// paneles de "Ver"). Cada modal pone solo su contenido; la estructura,
// el comportamiento y la adaptación a cada pantalla viven acá.
//
// Por qué existe: cada modal tenía su propia cáscara copiada, y en
// celular fallaban de formas parecidas — sin alto máximo ni scroll
// interno (los últimos campos y el botón Guardar quedaban fuera de la
// pantalla), o con anchos que no se adaptaban.
//
// Cómo se ve:
//   - Celular (menos de 640px): PANTALLA COMPLETA. Título y ✕ fijos
//     arriba, botones (pie) fijos abajo, y solo el contenido del medio
//     se desplaza. El botón de Guardar nunca se pierde.
//   - Desde 640px: centrado, con el ancho que pida cada modal y un alto
//     máximo del 90% de la pantalla — misma estructura adentro.
//
// Comportamiento:
//   - Esc cierra el modal (en todos, no solo en algunos como antes).
//   - Tocar el fondo oscuro NO cierra por defecto: en un formulario, un
//     toque accidental afuera perdía todo lo cargado. Los paneles de
//     "Ver" (solo lectura) pasan cerrarAlTocarFondo, porque ahí no hay
//     nada que perder.
//   - Mientras está abierto, la página de atrás no se desplaza.
//   - Se dibuja con un portal directo en <body>, con z-50: queda por
//     encima de la barra inferior de celular y del menú lateral
//     flotante, sin importar dónde esté montado el modal.
//   - El mensaje de error (prop "error") va FUERA de la zona con
//     scroll, justo arriba de los botones: así se ve aunque la persona
//     esté abajo de todo en un formulario largo cuando aprieta Guardar.
//
// Props:
//   titulo             → texto del encabezado
//   subtitulo          → opcional (texto o JSX), debajo del título
//   onCerrar           → función que cierra el modal
//   pie                → opcional: los botones de abajo
//   error              → opcional: mensaje de error a mostrar
//   ancho              → "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl"
//   cerrarAlTocarFondo → opcional, false por defecto
//   children           → el contenido

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

// Clases completas (no armadas con template string) para que Tailwind
// las detecte al compilar.
const ANCHOS = {
  md:    "sm:max-w-md",
  lg:    "sm:max-w-lg",
  xl:    "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
}

export default function ModalBase({
  titulo,
  subtitulo,
  onCerrar,
  pie,
  error,
  ancho = "lg",
  cerrarAlTocarFondo = false,
  children,
}) {
  // onCerrar suele llegar como función nueva en cada render (ej. una
  // flecha inline). Se guarda en una ref para que el listener de Esc
  // siempre llame a la versión más reciente sin re-suscribirse.
  const onCerrarRef = useRef(onCerrar)
  useEffect(() => {
    onCerrarRef.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    function manejarTecla(e) {
      if (e.key === "Escape") onCerrarRef.current?.()
    }
    document.addEventListener("keydown", manejarTecla)
    return () => document.removeEventListener("keydown", manejarTecla)
  }, [])

  // Bloquea el scroll de la página de atrás mientras el modal está
  // abierto, y deja el valor que tenía antes al cerrarse.
  useEffect(() => {
    const anterior = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = anterior
    }
  }, [])

  if (typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex bg-black/50 sm:items-center sm:justify-center sm:p-4"
      onClick={cerrarAlTocarFondo ? onCerrar : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-lg sm:shadow-xl ${ANCHOS[ancho] || ANCHOS.lg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado — fijo arriba */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-800 sm:text-lg">{titulo}</h2>
            {subtitulo && <div className="mt-0.5 text-sm text-gray-500">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 text-xl font-bold text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Contenido — lo único que se desplaza */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          {children}
        </div>

        {/* Error — fuera del scroll, siempre a la vista */}
        {error && (
          <div className="shrink-0 border-t border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:px-6">
            {error}
          </div>
        )}

        {/* Pie — fijo abajo. El padding extra respeta la barra de gestos
            de los celulares actuales. */}
        {pie && (
          <div
            className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
          >
            {pie}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}