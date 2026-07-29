import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import TiposMisionesTable from "@/components/tipos-misiones/TiposMisionesTable"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"

export default async function TiposMisionesPage() {
  
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "TIPOS_MISIONES")) {
    return <SinPermisos mensaje="No tenés permiso para ver tipos de misiones." />
  }

  const tiposMisiones = await prisma.tipoMision.findMany({
    where:   { deleted_at: null },
    orderBy: [{ clasificacion: "asc" }, { codigo: "asc" }],
  })

  // Extraemos los permisos del módulo TIPOS_MISIONES de la sesión
  const permisos = session?.user?.permisos?.TIPOS_MISIONES

  return (
    <TiposMisionesTable tiposMisiones={tiposMisiones} permisos={permisos} />
  )
}