import prisma from "@/lib/prisma"
import Navbar from "@/components/dashboard/Navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import AeronavesTable from "@/components/aeronaves/AeronavesTable"

export default async function AeronavesPage() {

  const session = await getServerSession(authOptions)

  const aeronaves = await prisma.aeronave.findMany({
    where:   { activo: true },
    orderBy: { matricula: "asc" },
  })

  // Extraemos los permisos del módulo AERONAVES de la sesión
  const permisos = session?.user?.permisos?.AERONAVES

  return (
    <div className="flex h-screen bg-gray-100">
      <Navbar
        nombre={session?.user?.nombre}
        apellido={session?.user?.apellido}
        rol={session?.user?.rol}
        nivel={session?.user?.nivel}
      />
      <main className="flex-1 ml-64 overflow-y-auto">
        <AeronavesTable aeronaves={aeronaves} permisos={permisos} />
      </main>
    </div>
  )
}