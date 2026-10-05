// src/components/shared/SeparadorSeccion.js
//
// Divisor visual para marcar "acá empieza lo que tenés que completar",
// después de la sección de datos de solo lectura de la escala. Mismo
// componente para Post-Vuelo, Manifiesto, y cualquier otro módulo con
// el patrón "info de arriba, formulario de abajo".
//
// CAMBIO (rama fix/responsive-base): la pastilla tenía shrink-0 — no
// se achicaba nunca y su texto nunca se partía, así que en un panel
// angosto un texto largo ("TU REPORTE DE POST-VUELO") se salía por el
// costado. Ahora:
//   - La pastilla ocupa como máximo el 70% del ancho y, si el texto no
//     entra, se parte en dos renglones centrados.
//   - Las líneas de los costados tienen un mínimo de 1rem, así siempre
//     se ve que es un separador y no un botón suelto.

export default function SeparadorSeccion({ texto }) {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-px min-w-[1rem] flex-1 bg-blue-800" />
      <span className="max-w-[70%] rounded-full bg-blue-600 px-3 py-1 text-center text-[11px] font-semibold uppercase leading-tight tracking-wide text-white">
        {texto}
      </span>
      <div className="h-px min-w-[1rem] flex-1 bg-blue-800" />
    </div>
  )
}