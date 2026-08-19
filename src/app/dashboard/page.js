import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { necesitaAlertaHabilitacion } from "@/lib/personas"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"
import { ROLES_ADMIN } from "@/lib/autorizacion"

async function obtenerEstadisticas(sesion) {
  const aeronavesDisponibles = await prisma.aeronave.count({
    where: { estado: "DISPONIBLE", activo: true, deleted_at: null },
  })
  const totalAeronaves = await prisma.aeronave.count({
    where: { activo: true, deleted_at: null },
  })

  const hoyISO = new Date().toISOString().slice(0, 10)
  const inicioHoy = new Date(hoyISO)
  const escalasHoy = await prisma.escala.count({
    where: {
      fecha: { gte: inicioHoy, lte: inicioHoy },
      es_borrador: false,
      deleted_at: null,
    },
  })

  // Personal activo y Alertas son datos del módulo Personas — los dos
  // se gatean con el mismo permiso, no solo las alertas. null = "esta
  // tarjeta ni se calcula ni se muestra" (distinto de 0, que sí sería
  // un dato real).
  const tienePersonas = !!sesion.user.permisos?.PERSONAS?.puede_ver

  let alertas = null
  let totalPersonas = null
  if (tienePersonas) {
    totalPersonas = await prisma.persona.count({ where: { activo: true, deleted_at: null } })

    const personasParaAlertas = await prisma.persona.findMany({
      where: { activo: true, deleted_at: null },
      select: {
        nivel_operacional_habilitado: true,
        hab_anual_habilitada: true,
        habilitaciones_medicas: {
          where: { deleted_at: null },
          select: { vence: true, deleted_at: true },
        },
      },
    })
    alertas = personasParaAlertas.filter((p) => necesitaAlertaHabilitacion(p)).length
  }

  // ── Lo que te toca hacer — personal, no depende del permiso de
  // ningún módulo, sino de si SOS parte (tripulante/autorizante) de
  // algo puntual. Mismo criterio que ya usa el sidebar.

  let acusesPendientes = 0
  if (sesion.user.personaId) {
    acusesPendientes = await prisma.acuseRecibo.count({
      where: { persona_id: sesion.user.personaId, fecha_acuse: null, deleted_at: null },
    })
  }

  let postVueloPendientes = 0
  if (sesion.user.personaId) {
    const tienePermisoAmplio = !!sesion.user.permisos?.POST_VUELO?.puede_ver
    postVueloPendientes = await prisma.escala.count({
      where: {
        estado: "PROGRAMADA",
        autorizada: true,
        deleted_at: null,
        hora_despegue_estimada: { lte: new Date() },
        ...(tienePermisoAmplio
          ? {}
          : { tripulacion: { some: { persona_id: sesion.user.personaId, deleted_at: null } } }),
      },
    })
  }

  let pendientesAutorizar = 0
  if (sesion.user.esCargoDeCascada) {
    const { autorizantePersonaId } = await calcularAutorizanteActivo()
    const podesActuar = !!autorizantePersonaId && autorizantePersonaId === sesion.user.personaId
    if (podesActuar) {
      pendientesAutorizar = await prisma.escala.count({
        where: {
          es_borrador: false,
          autorizada: false,
          estado: { notIn: ["ABORTADA"] },
          deleted_at: null,
        },
      })
    }
  }

  return {
    totalPersonas,
    aeronavesDisponibles,
    totalAeronaves,
    escalasHoy,
    alertas,
    acusesPendientes,
    postVueloPendientes,
    pendientesAutorizar,
  }
}

function obtenerFechaYSaludo() {
  const ahora = new Date()
  const hora  = ahora.getHours()

  let saludo
  if (hora >= 6 && hora < 12)       saludo = "Buenos días"
  else if (hora >= 12 && hora < 19) saludo = "Buenas tardes"
  else                               saludo = "Buenas noches"

  const fecha = ahora.toLocaleDateString("es-PY", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  })

  return { saludo, fecha }
}

export default async function DashboardPage() {
  const sesion = await getServerSession(authOptions)
  const stats  = await obtenerEstadisticas(sesion)
  const { saludo, fecha } = obtenerFechaYSaludo()

  const tareasPersonales = [
    stats.acusesPendientes > 0 && {
      titulo: "Acuses de recibo",
      valor: stats.acusesPendientes,
      descripcion: "escalas por confirmar",
      color: "bg-purple-500",
    },
    stats.postVueloPendientes > 0 && {
      titulo: "Post-Vuelo",
      valor: stats.postVueloPendientes,
      descripcion: "escalas por reportar",
      color: "bg-teal-600",
    },
    stats.pendientesAutorizar > 0 && {
      titulo: "Por autorizar",
      valor: stats.pendientesAutorizar,
      descripcion: "escalas esperando tu autorización",
      color: "bg-amber-500",
    },
  ].filter(Boolean)

  const tarjetasOperativas = [
    {
      titulo:      "Escalas hoy",
      valor:       stats.escalasHoy,
      descripcion: "vuelos programados",
      color:       "bg-blue-500",
    },
    {
      titulo:      "Aeronaves",
      valor:       `${stats.aeronavesDisponibles}/${stats.totalAeronaves}`,
      descripcion: "disponibles",
      color:       "bg-green-500",
    },
  ]

  if (stats.totalPersonas !== null) {
    tarjetasOperativas.push({
      titulo:      "Personal activo",
      valor:       stats.totalPersonas,
      descripcion: "personas registradas",
      color:       "bg-indigo-500",
    })
  }
  if (stats.alertas !== null) {
    tarjetasOperativas.push({
      titulo:      "Alertas",
      valor:       stats.alertas,
      descripcion: "habilitaciones que requieren atención",
      color:       "bg-red-500",
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 capitalize">
          {saludo}, {sesion.user.nombre}
        </h2>
        <p className="text-gray-500 mt-1 capitalize">{fecha}</p>
      </div>

      {tareasPersonales.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Lo que te toca hacer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tareasPersonales.map((tarjeta) => (
              <div key={tarjeta.titulo} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-l-red-400">
                <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${tarjeta.color} mb-3`}>
                  {tarjeta.titulo}
                </div>
                <p className="text-3xl font-bold text-gray-800">{tarjeta.valor}</p>
                <p className="text-sm text-gray-500 mt-1">{tarjeta.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tarjetasOperativas.map((tarjeta) => (
          <div key={tarjeta.titulo} className="bg-white rounded-lg shadow-sm p-6">
            <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${tarjeta.color} mb-3`}>
              {tarjeta.titulo}
            </div>
            <p className="text-3xl font-bold text-gray-800">{tarjeta.valor}</p>
            <p className="text-sm text-gray-500 mt-1">{tarjeta.descripcion}</p>
          </div>
        ))}
      </div>

      {ROLES_ADMIN.includes(sesion.user.rol) && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Estado de módulos</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { nombre: "Tipos de Misiones", activo: true  },
              { nombre: "Aeronaves",         activo: true  },
              { nombre: "Personas",          activo: true  },
              { nombre: "Escalas",           activo: true  },
              { nombre: "Post-Vuelo",        activo: true  },
              { nombre: "Manifiesto",        activo: false },
              { nombre: "Informes",          activo: false },
              { nombre: "SICEM",             activo: false },
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
      )}
    </div>
  )
}