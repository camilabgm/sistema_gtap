// Destino: src/app/dashboard/sicem/eventos/page.js
//
// CAMBIO (rama feat/paginacion-servidor): paginado y filtrado en el
// servidor. Antes traía TODOS los eventos y la tabla filtraba en el
// navegador. Ahora:
//   - Lee de la URL ?pagina=, ?aeronave= (id) y ?estado= (ABIERTOS o
//     CERRADOS). En Next 16 los searchParams llegan como promesa.
//   - Filtra con Prisma y trae solo los 20 eventos de la página.
//   - La API GET /api/sicem/eventos NO cambia: la sigue usando
//     SicemEstadisticasPanel para calcular sobre todos los eventos.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemEventosTable from "@/components/sicem/SicemEventosTable"
import SubNavSicem from "@/components/sicem/SubNavSicem"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import { resolverNombresUsuarios } from "@/lib/auditoria"
import { leerPagina, leerTextoParam, datosPaginacion } from "@/lib/paginacion"

const ESTADOS_VALIDOS = ["ABIERTOS", "CERRADOS"]


export default async function EventosSicemPage({ searchParams }) {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "SICEM")) {
    return <SinPermisos mensaje="No tenés permiso para ver SICEM." />
  }

  const params = await searchParams

  // Aeronaves y componentes primero: la lista de aeronaves hace falta
  // para validar el filtro ?aeronave= antes de consultar los eventos.
  const [aeronaves, componentes] = await Promise.all([
    prisma.aeronave.findMany({
      where: { deleted_at: null, activo: true },
      select: { id: true, matricula: true, estado: true, motivo_no_disponible: true, motivo_otro: true },
      orderBy: { matricula: "asc" },
    }),
    prisma.componenteMantenimiento.findMany({
      where: { deleted_at: null, activo: true },
      select: { id: true, aeronave_id: true, tipo: true },
    }),
  ])

  // ?aeronave= solo vale si es una de las aeronaves del select. Un id
  // inventado a mano (?aeronave=999) se ignora: así el select y los
  // datos nunca muestran cosas distintas.
  const aeronavePedida = Number(leerTextoParam(params.aeronave))
  const aeronaveId = aeronaves.some((a) => a.id === aeronavePedida) ? aeronavePedida : null

  const estadoPedido = leerTextoParam(params.estado)
  const estado = ESTADOS_VALIDOS.includes(estadoPedido) ? estadoPedido : ""

  const where = { deleted_at: null }
  if (aeronaveId) where.aeronave_id = aeronaveId
  if (estado === "ABIERTOS") where.cerrado = false
  if (estado === "CERRADOS") where.cerrado = true

  // Primero el total (para saber cuántas páginas hay y si la pedida
  // existe), después solo los eventos de esa página.
  const total = await prisma.eventoMantenimiento.count({ where })
  const { pagina, totalPaginas, skip, take } = datosPaginacion(leerPagina(params.pagina), total)

  const eventos = await prisma.eventoMantenimiento.findMany({
    where,
    include: {
      aeronave: { select: { id: true, matricula: true } },
      componente: { select: { id: true, tipo: true } },
    },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take,
  })

  const idsAResolver = [
    ...new Set(
      eventos.flatMap((ev) => [ev.creado_por, ev.editado_por, ev.cerrado_por]).filter(Boolean)
    ),
  ]
  const nombres = await resolverNombresUsuarios(idsAResolver)

  const eventosConNombres = eventos.map((ev) => ({
    ...ev,
    creado_por_nombre: ev.creado_por ? nombres[ev.creado_por] ?? null : null,
    editado_por_nombre: ev.editado_por ? nombres[ev.editado_por] ?? null : null,
    cerrado_por_nombre: ev.cerrado_por ? nombres[ev.cerrado_por] ?? null : null,
  }))

  const permisos = session?.user?.permisos?.SICEM

  return (
    <>
      <SubNavSicem
        permisos={session.user.permisos}
        esCargoDeCascada={session.user.esCargoDeCascada}
      />
      <SicemEventosTable
        eventos={eventosConNombres}
        aeronaves={aeronaves}
        componentes={componentes}
        permisos={permisos}
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        filtros={{ aeronave: aeronaveId ? String(aeronaveId) : "", estado }}
      />
    </>
  )
}