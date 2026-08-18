// Divisor visual para marcar "acá empieza lo que tenés que completar",
// después de la sección de datos de solo lectura de la escala. Mismo
// componente para Post-Vuelo, Manifiesto, y cualquier otro módulo con
// el patrón "info de arriba, formulario de abajo".

export default function SeparadorSeccion({ texto }) {
  return (
    <div className="my-1 flex items-center gap-3">
      <div className="h-px flex-1 bg-blue-800" />
      <span className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
        {texto}
      </span>
      <div className="h-px flex-1 bg-blue-800" />
    </div>
  )
}