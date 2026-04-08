import prisma from "@/lib/prisma"
import Navbar from "@/components/dashboard/Navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import AeronavesTable from "@/components/aeronaves/AeronavesTable"

export default async function AeronavesPage() {

  const session = await getServerSession(authOptions)

  // Traemos todas las aeronaves activas ordenadas por matrícula
  const aeronaves = await prisma.aeronave.findMany({
    where:   { activo: true },
    orderBy: { matricula: "asc" },
  })

  return (
    <div className="flex h-screen bg-gray-100">
      <Navbar
        nombre={session?.user?.nombre}
        apellido={session?.user?.apellido}
        rol={session?.user?.rol}
        nivel={session?.user?.nivel}
      />
      <main className="flex-1 ml-64 overflow-y-auto">
        <AeronavesTable aeronaves={aeronaves} />
      </main>
    </div>
  )
}