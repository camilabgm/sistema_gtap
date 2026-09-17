// Destino: src/app/dashboard/sicem/estadisticas/page.js
//
// Cuarta sección de SICEM, hermana de Componentes/Eventos/Alertas.
// Solo lectura — junta datos que ya existen en EventoMantenimiento,
// no necesitó ningún modelo nuevo.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemEstadisticasPanel from "@/components/sicem/SicemEstadisticasPanel"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"

export default async function EstadisticasSicemPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "SICEM")) {
    return <SinPermisos mensaje="No tenés permiso para ver SICEM." />
  }

  const eventos = await prisma.eventoMantenimiento.findMany({
    where: { deleted_at: null },
    select: {
      id: true,
      tipo: true,
      lugar: true,
      cerrado: true,
      created_at: true,
      cerrado_en: true,
      aeronave: { select: { id: true, matricula: true } },
    },
    orderBy: { created_at: "desc" },
  })

  return <SicemEstadisticasPanel eventos={eventos} />
}