// src/app/dashboard/personas/page.js
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import PersonasTable from "@/components/personas/PersonasTable"
import { tienePermiso } from "@/lib/permisos"
import { esAdministrador } from "@/lib/autorizacion"
import SinPermisos from "@/components/shared/SinPermisos"


export default async function PersonasPage() {

  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "PERSONAS")) {
    return <SinPermisos mensaje="No tenés permiso para ver personas." />
  }

  const personas = await prisma.persona.findMany({
    where:   { activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    include: {
      usuario: { include: { rol: true } },
      // Incluir habilitaciones médicas para los badges de la tabla
      habilitaciones_medicas: {
        where:   { deleted_at: null },
        orderBy: [{ anio: "desc" }, { periodo: "desc" }],
      },
    },
  })

  const permisos = session?.user?.permisos?.PERSONAS
  const puedeGestionarPermisos = esAdministrador(session)

  return (
    <PersonasTable
      personas={personas}
      permisos={permisos}
      puedeGestionarPermisos={puedeGestionarPermisos}
    />
  )
}