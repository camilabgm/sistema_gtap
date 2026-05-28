import prisma from "@/lib/prisma"
import Navbar from "@/components/dashboard/Navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import TiposMisionesTable from "@/components/tipos-misiones/TiposMisionesTable"

export default async function TiposMisionesPage() {
  
  const session = await getServerSession(authOptions)

  const tiposMisiones = await prisma.tipoMision.findMany({
    where:   { deleted_at: null },
    orderBy: [{ clasificacion: "asc" }, { codigo: "asc" }],
  })

  // Extraemos los permisos del módulo TIPOS_MISIONES de la sesión
  const permisos = session?.user?.permisos?.TIPOS_MISIONES
  {/*console.log("PERMISOS TIPOS MISIONES:", session?.user?.permisos?.TIPOS_MISIONES ) */}
  return (
    <div className="flex h-screen bg-gray-100">
      <Navbar
        nombre={session?.user?.nombre}
        apellido={session?.user?.apellido}
        rol={session?.user?.rol}
        nivel={session?.user?.nivel}
      />
      <main className="flex-1 ml-64 overflow-y-auto">
        <TiposMisionesTable tiposMisiones={tiposMisiones} permisos={permisos} />
      </main>
    </div>
  )
}