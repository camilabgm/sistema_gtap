import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import AeronavesTable from "@/components/aeronaves/AeronavesTable"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"

export default async function AeronavesPage() {

  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "AERONAVES")) {
    return <SinPermisos mensaje="No tenés permiso para ver aeronaves." />
  }

  // CAMBIO: se trae aparte qué aeronaves tienen un Evento de SICEM
  // abierto — la tabla lo necesita para bloquear la acción de
  // disponibilidad ("Gestionado por SICEM"). Se calcula con una
  // consulta simple en vez de un _count filtrado, para no depender de
  // una versión puntual de Prisma.
  const [aeronaves, eventosAbiertos] = await Promise.all([
    prisma.aeronave.findMany({
      where:   { activo: true },
      orderBy: { matricula: "asc" },
    }),
    prisma.eventoMantenimiento.findMany({
      where:  { cerrado: false, deleted_at: null },
      select: { aeronave_id: true },
    }),
  ])

  const idsConEventoAbierto = new Set(eventosAbiertos.map((e) => e.aeronave_id))
  const aeronavesConEstado = aeronaves.map((a) => ({
    ...a,
    tiene_evento_abierto: idsConEventoAbierto.has(a.id),
  }))

  const permisos = session?.user?.permisos?.AERONAVES

  return (
    <AeronavesTable aeronaves={aeronavesConEstado} permisos={permisos} />
  )
}