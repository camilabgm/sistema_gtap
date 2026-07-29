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

  const aeronaves = await prisma.aeronave.findMany({
    where:   { activo: true },
    orderBy: { matricula: "asc" },
  })

  // Extraemos los permisos del módulo AERONAVES de la sesión
  const permisos = session?.user?.permisos?.AERONAVES

  return (
    <AeronavesTable aeronaves={aeronaves} permisos={permisos} />
  )
}