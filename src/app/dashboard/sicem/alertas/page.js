// Destino: src/app/dashboard/sicem/alertas/page.js
//
// Solo lectura — no hay POST/PUT acá, junta datos que ya existen en
// ComponenteMantenimiento (no necesitó ningún modelo nuevo).

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import SicemAlertasPanel from "@/components/sicem/SicemAlertasPanel"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import { calcularHorasDisponibles, motivosAlerta } from "@/lib/sicem"

export default async function AlertasSicemPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "SICEM")) {
    return <SinPermisos mensaje="No tenés permiso para ver SICEM." />
  }

  const componentes = await prisma.componenteMantenimiento.findMany({
    where: { deleted_at: null, activo: true },
    include: { aeronave: { select: { id: true, matricula: true } } },
  })

  const alertas = componentes
    .map((c) => ({
      ...c,
      horas_disponibles_minutos: calcularHorasDisponibles(c),
      motivos_alerta: motivosAlerta(c),
    }))
    .filter((c) => c.motivos_alerta.length > 0)
    .sort((a, b) => {
      // Umbral superado primero (horas negativas), después por menos
      // horas disponibles. Los que solo alertan por calendario (sin
      // umbral de horas cargado) quedan al final, por fecha más próxima.
      const aHoras = a.horas_disponibles_minutos
      const bHoras = b.horas_disponibles_minutos
      if (aHoras !== null && bHoras !== null) return aHoras - bHoras
      if (aHoras !== null) return -1
      if (bHoras !== null) return 1
      return new Date(a.fecha_proxima_inspeccion) - new Date(b.fecha_proxima_inspeccion)
    })

  return <SicemAlertasPanel alertas={alertas} />
}