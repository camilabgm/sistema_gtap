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
      habilitaciones_medicas: {
        where:   { deleted_at: null },
        orderBy: [{ anio: "desc" }, { periodo: "desc" }],
      },
    },
  })

  const permisos = session?.user?.permisos?.PERSONAS

  // Variable local distinta de "esAdministrador" (el nombre de la función
  // importada) para no pisarla — pero la prop que le pasamos al componente
  // sí se llama "esAdministrador", así queda igual de clara para quien lea
  // PersonasTable o HabilitacionesModal.
  const esAdmin = esAdministrador(session)

  return (
    <PersonasTable
      personas={personas}
      permisos={permisos}
      esAdministrador={esAdmin}
    />
  )
}