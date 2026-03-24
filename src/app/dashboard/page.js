import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"

// Función que obtiene las estadísticas para las tarjetas
// Usamos try/catch en cada consulta porque algunos módulos
// todavía no tienen tablas creadas en la BD
async function obtenerEstadisticas() {
  // Contamos personas activas — esta tabla ya existe
  const totalPersonas = await prisma.persona.count({
    where: { activo: true, deleted_at: null }
  })

  // Contamos tipos de misiones activos — esta tabla ya existe
  const totalTiposMisiones = await prisma.tipoMision.count({
    where: { activo: true, deleted_at: null }
  })

  // Las siguientes tablas todavía no existen en el schema
  // Las dejamos en 0 por ahora y se llenarán cuando creemos esos módulos
  const escalasHoy = 0
  const aeronavesDisponibles = 0
  const totalAeronaves = 0
  const alertas = 0

  return {
    totalPersonas,
    totalTiposMisiones,
    escalasHoy,
    aeronavesDisponibles,
    totalAeronaves,
    alertas,
  }
}

// Formatea la fecha actual en español
function obtenerFechaYSaludo() {
  const ahora = new Date()
  const hora = ahora.getHours()

  let saludo
  if (hora >= 6 && hora < 12) saludo = "Buenos días"
  else if (hora >= 12 && hora < 19) saludo = "Buenas tardes"
  else saludo = "Buenas noches"

  const fecha = ahora.toLocaleDateString("es-PY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return { saludo, fecha }
}

export default async function DashboardPage() {
  const sesion = await getServerSession(authOptions)
  const stats = await obtenerEstadisticas()
  const { saludo, fecha } = obtenerFechaYSaludo()

  // Las tarjetas del dashboard
  // Cuando avancemos con módulos, los valores se actualizarán solos
  const tarjetas = [
    {
      titulo: "Escalas hoy",
      valor: stats.escalasHoy,
      descripcion: "vuelos programados",
      color: "bg-blue-500",
    },
    {
      titulo: "Aeronaves",
      valor: `${stats.aeronavesDisponibles}/${stats.totalAeronaves}`,
      descripcion: "disponibles",
      color: "bg-green-500",
    },
    {
      titulo: "Personal activo",
      valor: stats.totalPersonas,
      descripcion: "personas registradas",
      color: "bg-purple-500",
    },
    {
      titulo: "Alertas",
      valor: stats.alertas,
      descripcion: "requieren atención",
      color: "bg-red-500",
    },
  ]

  return (
    <div>
      {/* Encabezado */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 capitalize">
          {saludo}, {sesion.user.nombre}
        </h2>
        <p className="text-gray-500 mt-1 capitalize">{fecha}</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tarjetas.map((tarjeta) => (
          <div
            key={tarjeta.titulo}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${tarjeta.color} mb-3`}>
              {tarjeta.titulo}
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {tarjeta.valor}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {tarjeta.descripcion}
            </p>
          </div>
        ))}
      </div>

      {/* Sección de módulos disponibles */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Estado de módulos
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { nombre: "Tipos de Misiones", activo: true },
            { nombre: "Aeronaves",         activo: false },
            { nombre: "Personas",          activo: false },
            { nombre: "Escalas",           activo: false },
            { nombre: "Manifiesto",        activo: false },
            { nombre: "Informes",          activo: false },
            { nombre: "SICEM",             activo: false },
            { nombre: "Insp. Pre-vuelo",   activo: false },
          ].map((modulo) => (
            <div
              key={modulo.nombre}
              className={`
                px-4 py-3 rounded-md text-sm font-medium text-center
                ${modulo.activo
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
                }
              `}
            >
              {modulo.activo ? "✓" : "○"} {modulo.nombre}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}