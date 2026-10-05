// src/components/shared/EncabezadoPagina.js
//
// Encabezado común de los módulos: la tarjeta blanca de arriba con
// título, subtítulo, el/los botones de acción ("Nueva persona",
// "Actualizar", "Descargar PDF"...) y, debajo, lo que cada módulo
// necesite dentro de la misma tarjeta (buscador, filtros, contadores).
//
// Antes cada módulo tenía su propia copia de este bloque, todas con el
// mismo problema: título y botón en la misma fila, con el botón en
// shrink-0 (no se achica nunca). En un celular angosto no entraban los
// dos y el botón se salía de la tarjeta. Acá:
//   - En celular: el botón baja DEBAJO del subtítulo, alineado a la
//     izquierda, con su ancho natural.
//   - Desde 640px (sm:): título a la izquierda, botón a la derecha,
//     como siempre.
//   - El título es un poco más chico en celular (text-xl), para que
//     uno largo ("Alertas y próximas inspecciones") no ocupe tres
//     renglones.
//
// Props:
//   titulo        → opcional (Informes usa solo subtítulo, porque el
//                   título "Informes" ya está arriba de sus pestañas)
//   subtitulo     → opcional
//   acciones      → opcional: uno o más botones, tal cual los arma cada
//                   módulo (cada uno conserva sus permisos y su onClick)
//   volverAInicio → opcional: muestra "Volver a Inicio" arriba de la
//                   tarjeta, solo en celular. Escalas y SICEM no lo
//                   usan porque su SubNav ya lo trae.
//   children      → lo que va debajo, dentro de la misma tarjeta
//
// Sin "use client": no tiene estado ni eventos propios, así que lo
// pueden usar tanto componentes de cliente como páginas de servidor.

import BotonVolverInicio from "@/components/shared/BotonVolverInicio"

export default function EncabezadoPagina({ titulo, subtitulo, acciones, volverAInicio = false, children }) {
  return (
    <>
      {volverAInicio && (
        <div className="md:hidden mb-2">
          <BotonVolverInicio />
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 mb-4">
        <div className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${children ? "mb-4" : ""}`}>
          <div className="min-w-0">
            {titulo && <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{titulo}</h1>}
            {subtitulo && <p className={`text-sm text-gray-500 ${titulo ? "mt-1" : ""}`}>{subtitulo}</p>}
          </div>
          {acciones && (
            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              {acciones}
            </div>
          )}
        </div>

        {children}
      </div>
    </>
  )
}