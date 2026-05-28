// src/app/dashboard/personas/page.js
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { PrismaClient } from "@prisma/client"
import PersonasTable from "@/components/personas/PersonasTable"

const prisma = new PrismaClient()

export default async function PersonasPage() {

  const session = await getServerSession(authOptions)

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

  const permisos   = session?.user?.permisos?.PERSONAS
  const rolUsuario = session?.user?.rol

  return (
    <PersonasTable
      personas={personas}
      permisos={permisos}
      rolUsuario={rolUsuario}
    />
  )
}
