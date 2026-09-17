// Destino: src/app/dashboard/sicem/componentes/page.js
//
// CORRECCIÓN: se agrega el guard tienePermiso() + <SinPermisos /> que
// faltaba en la versión anterior — lo inferí sin tener PersonasPage
// delante, y PersonasPage sí lo tiene. Ahora calca el patrón real.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemComponentesTable from "@/components/sicem/SicemComponentesTable"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import { calcularHorasDisponibles, necesitaAlerta } from "@/lib/sicem"

export default async function ComponentesSicemPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "SICEM")) {
    return <SinPermisos mensaje="No tenés permiso para ver SICEM." />
  }

  const [componentes, aeronaves] = await Promise.all([
    prisma.componenteMantenimiento.findMany({
      where: { deleted_at: null },
      include: { aeronave: { select: { id: true, matricula: true, tipo: true } } },
      orderBy: [{ aeronave_id: "asc" }, { tipo: "asc" }],
    }),
    prisma.aeronave.findMany({
      where: { deleted_at: null, activo: true },
      select: {
        id: true,
        matricula: true,
        horas_vuelo_totales_minutos: true,
        trackea_ciclos_aterrizajes: true,
        ciclos_acumulados: true,
        aterrizajes_acumulados: true,
      },
      orderBy: { matricula: "asc" },
    }),
  ])

  const componentesConCalculo = componentes.map((c) => ({
    ...c,
    horas_disponibles_minutos: calcularHorasDisponibles(c),
    necesita_alerta: necesitaAlerta(c),
  }))

  const permisos = session?.user?.permisos?.SICEM

  return (
    <SicemComponentesTable
      componentes={componentesConCalculo}
      aeronaves={aeronaves}
      permisos={permisos}
    />
  )
}