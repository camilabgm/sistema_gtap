export default function SinPermisos({ mensaje }) {
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
      <p className="mt-2 text-gray-600">{mensaje}</p>
    </div>
  )
}