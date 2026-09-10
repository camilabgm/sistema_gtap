// Destino: src/app/dashboard/sicem/eventos/page.js

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemEventosTable from "@/components/sicem/SicemEventosTable"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"

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
      select: { id: true, matricula: true },
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

  const permisos = session?.user?.permisos?.SICEM

  return (
    <SicemEventosTable
      eventos={eventos}
      aeronaves={aeronaves}
      componentes={componentes}
      permisos={permisos}
    />
  )
}