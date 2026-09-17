// Destino: src/app/dashboard/sicem/eventos/page.js
//
// CAMBIO: se resuelven los nombres de quién creó/editó/cerró cada
// evento — mismo patrón que el GET de post-vuelo (resolverNombresUsuarios),
// para que el panel de "Ver" pueda mostrar la auditoría completa.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemEventosTable from "@/components/sicem/SicemEventosTable"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import { resolverNombresUsuarios } from "@/lib/auditoria"

export default async function EventosSicemPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "SICEM")) {
    return <SinPermisos mensaje="No tenés permiso para ver SICEM." />
  }

  const [eventos, aeronaves, componentes] = await Promise.all([
    prisma.eventoMantenimiento.findMany({
      where: { deleted_at: null },
      include: {
        aeronave: { select: { id: true, matricula: true } },
        componente: { select: { id: true, tipo: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.aeronave.findMany({
      where: { deleted_at: null, activo: true },
      select: { id: true, matricula: true, estado: true, motivo_no_disponible: true, motivo_otro: true },
      orderBy: { matricula: "asc" },
    }),
    // Para el selector de "componente afectado" en el formulario —
    // se filtra por aeronave del lado del cliente, no hace falta un
    // fetch nuevo cada vez que cambia la aeronave elegida.
    prisma.componenteMantenimiento.findMany({
      where: { deleted_at: null, activo: true },
      select: { id: true, aeronave_id: true, tipo: true },
    }),
  ])

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
    <SicemEventosTable
      eventos={eventosConNombres}
      aeronaves={aeronaves}
      componentes={componentes}
      permisos={permisos}
    />
  )
}