// Destino: src/app/dashboard/informes/page.js

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import InformesTabs from "@/components/informes/InformesTabs"

export default async function InformesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.permisos?.INFORMES?.puede_ver) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para ver los informes.</p>
      </div>
    )
  }

  const [aeronaves, tiposMision] = await Promise.all([
    prisma.aeronave.findMany({
      where: { activo: true, deleted_at: null },
      orderBy: { matricula: "asc" },
      select: { id: true, matricula: true },
    }),
    prisma.tipoMision.findMany({
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, nombre: true },
    }),
  ])

  return <InformesTabs aeronaves={aeronaves} tiposMision={tiposMision} />
}