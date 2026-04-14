import prisma from "@/lib/prisma"
import Navbar from "@/components/dashboard/Navbar"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import PersonasTable from "@/components/personas/PersonasTable"

export default async function PersonasPage() {

  const session = await getServerSession(authOptions)

  const personas = await prisma.persona.findMany({
    where:   { activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    include: { usuario: true },
  })

  // Extraemos los permisos del módulo PERSONAS de la sesión
  const permisos = session?.user?.permisos?.PERSONAS

  return (
    <div className="flex h-screen bg-gray-100">
      <Navbar
        nombre={session?.user?.nombre}
        apellido={session?.user?.apellido}
        rol={session?.user?.rol}
        nivel={session?.user?.nivel}
      />
      <main className="flex-1 ml-64 overflow-y-auto">
        <PersonasTable personas={personas} permisos={permisos} />
      </main>
    </div>
  )
}