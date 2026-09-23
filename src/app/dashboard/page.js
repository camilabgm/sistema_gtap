// Destino: src/app/dashboard/page.js
//
// Tarjetas ahora clickeables. Las que dependen de UNA escala puntual
// (Post-Vuelo, Manifiesto) llevan directo a la primera pendiente, no
// solo a la lista general — para eso, obtenerEstadisticas() ahora
// también guarda el id de esa primera escala, no solo el conteo.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import Link from "next/link"
import prisma from "@/lib/prisma"
import { necesitaAlertaHabilitacion } from "@/lib/personas"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"
import { ROLES_ADMIN } from "@/lib/autorizacion"
import { teCorrespondeReportarPostVuelo } from "@/lib/postVuelo"
import { yaPasoLaHora } from "@/lib/escalas"
import { ROLES_GLOBAL_MANIFIESTO } from "@/lib/manifiesto"

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

  // ── Lo que te toca hacer ──────────────────────────────────────────

  let acusesPendientes = 0
  let primeraEscalaAcuse = null
  let primeraFechaAcuse = null
  if (sesion.user.personaId) {
    const acuses = await prisma.acuseRecibo.findMany({
      where: { persona_id: sesion.user.personaId, fecha_acuse: null, deleted_at: null },
      select: {
        escala_id: true,
        escala: { select: { hora_despegue_estimada: true } },
      },
      orderBy: { created_at: "asc" },
    })
    acusesPendientes = acuses.length
    primeraEscalaAcuse = acuses[0]?.escala_id ?? null
    // Formateado a mano (no toISOString) para no correr el riesgo de
    // que un vuelo tarde en la noche paraguaya cruce a otro día en
    // UTC y termine apuntando a la fecha equivocada en Agenda.
    const horaDespegue = acuses[0]?.escala?.hora_despegue_estimada
    if (horaDespegue) {
      const d = new Date(horaDespegue)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, "0")
      const dia = String(d.getDate()).padStart(2, "0")
      primeraFechaAcuse = `${y}-${m}-${dia}`
    }
  }

  // Post-Vuelo pendientes — ahora también guarda el id de la primera
  // escala, para que la tarjeta pueda llevar directo ahí en vez de
  // solo a la lista general.
  let postVueloPendientes = 0
  let primeraEscalaPostVuelo = null
  {
    const candidatas = await prisma.escala.findMany({
      // Ahora — mismo criterio que ya usa GET /api/post-vuelo, para que el
      // Jefe de Combustible vea acá también las escalas que ya cerraron
      // tramos (CUMPLIDA) pero les sigue faltando el combustible:
      where: {
        estado: { in: ["PROGRAMADA", "CUMPLIDA"] },
        autorizada: true,
        deleted_at: null,
        hora_despegue_estimada: { lte: new Date() },
      },
      select: {
        id: true,
        tripulacion: { where: { deleted_at: null }, select: { persona_id: true } },
        post_vuelos: { where: { deleted_at: null }, select: { combustible_consumido: true }, take: 1 },
      },
      orderBy: { hora_despegue_estimada: "asc" },
    })
    const filtradas = candidatas.filter((e) => {
      const postVuelo = e.post_vuelos[0] ?? null
      return teCorrespondeReportarPostVuelo(sesion, e, postVuelo)
    })
    postVueloPendientes = filtradas.length
    primeraEscalaPostVuelo = filtradas[0]?.id ?? null
  }

  // Manifiesto pendientes — mismo criterio, guarda el id de la
  // primera escala.
  let manifiestoPendientes = 0
  let primeraEscalaManifiesto = null
  if (sesion.user.esSupervisorSemana || ROLES_GLOBAL_MANIFIESTO.includes(sesion.user.rol)) {
    const candidatasManifiesto = await prisma.escala.findMany({
      where: {
        estado: "PROGRAMADA",
        autorizada: true,
        manifiesto_cerrado: false,
        deleted_at: null,
      },
      select: { id: true, hora_despegue_estimada: true },
      orderBy: { hora_despegue_estimada: "asc" },
    })
    const filtradas = candidatasManifiesto.filter((e) => !yaPasoLaHora(e.hora_despegue_estimada))
    manifiestoPendientes = filtradas.length
    primeraEscalaManifiesto = filtradas[0]?.id ?? null
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
          hora_despegue_estimada: { gt: new Date() },
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
    primeraEscalaAcuse,
    primeraFechaAcuse,
    postVueloPendientes,
    primeraEscalaPostVuelo,
    manifiestoPendientes,
    primeraEscalaManifiesto,
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
      href: stats.primeraEscalaAcuse && stats.primeraFechaAcuse
        ? `/dashboard/escalas?fecha=${stats.primeraFechaAcuse}&escala=${stats.primeraEscalaAcuse}`
        : "/dashboard/escalas",
    },
    stats.postVueloPendientes > 0 && {
      titulo: "Post-Vuelo",
      valor: stats.postVueloPendientes,
      descripcion: "escalas por reportar",
      color: "bg-teal-600",
      href: stats.primeraEscalaPostVuelo
        ? `/dashboard/post-vuelo?escala=${stats.primeraEscalaPostVuelo}`
        : "/dashboard/post-vuelo",
    },
    stats.manifiestoPendientes > 0 && {
      titulo: "Manifiesto",
      valor: stats.manifiestoPendientes,
      descripcion: "escalas con manifiesto por completar",
      color: "bg-indigo-600",
      href: stats.primeraEscalaManifiesto
        ? `/dashboard/manifiesto?escala=${stats.primeraEscalaManifiesto}`
        : "/dashboard/manifiesto",
    },
    stats.pendientesAutorizar > 0 && {
      titulo: "Por autorizar",
      valor: stats.pendientesAutorizar,
      descripcion: "escalas esperando tu autorización",
      color: "bg-amber-500",
      href: "/dashboard/escalas/pendientes-autorizar",
    },
  ].filter(Boolean)

  const tarjetasOperativas = [
    {
      titulo:      "Escalas hoy",
      valor:       stats.escalasHoy,
      descripcion: "vuelos programados",
      color:       "bg-blue-500",
      href:        "/dashboard/escalas",
    },
    {
      titulo:      "Aeronaves",
      valor:       `${stats.aeronavesDisponibles}/${stats.totalAeronaves}`,
      descripcion: "disponibles",
      color:       "bg-green-500",
      href:        "/dashboard/aeronaves",
    },
  ]

  if (stats.totalPersonas !== null) {
    tarjetasOperativas.push({
      titulo:      "Personal activo",
      valor:       stats.totalPersonas,
      descripcion: "personas registradas",
      color:       "bg-indigo-500",
      href:        "/dashboard/personas",
    })
  }
  if (stats.alertas !== null) {
    tarjetasOperativas.push({
      titulo:      "Alertas",
      valor:       stats.alertas,
      descripcion: "habilitaciones que requieren atención",
      color:       "bg-red-500",
      href:        "/dashboard/personas",
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
              <Link
                key={tarjeta.titulo}
                href={tarjeta.href}
                className="block bg-white rounded-lg shadow-sm p-6 border-l-4 border-l-red-400 hover:shadow-md transition-shadow"
              >
                <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${tarjeta.color} mb-3`}>
                  {tarjeta.titulo}
                </div>
                <p className="text-3xl font-bold text-gray-800">{tarjeta.valor}</p>
                <p className="text-sm text-gray-500 mt-1">{tarjeta.descripcion}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tarjetasOperativas.map((tarjeta) => (
          <Link
            key={tarjeta.titulo}
            href={tarjeta.href}
            className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className={`inline-block px-3 py-1 rounded-full text-white text-xs font-medium ${tarjeta.color} mb-3`}>
              {tarjeta.titulo}
            </div>
            <p className="text-3xl font-bold text-gray-800">{tarjeta.valor}</p>
            <p className="text-sm text-gray-500 mt-1">{tarjeta.descripcion}</p>
          </Link>
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
              { nombre: "Manifiesto",        activo: true },
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