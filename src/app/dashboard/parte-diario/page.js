import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import ParteDiarioPage from "@/components/parte-diario/ParteDiarioPage"

function hoyComoFecha() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
}

export default async function ParteDiarioDashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.permisos?.PERSONAS?.puede_ver) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para ver el parte diario.</p>
      </div>
    )
  }

  const personas = await prisma.persona.findMany({
    where:   { activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: {
      id:        true,
      nombre:    true,
      apellido:  true,
      grado:     true,
      escuadron: true,
    },
  })

  const novedades = await prisma.parteDiario.findMany({
    where: { fecha: hoyComoFecha(), deleted_at: null },
    include: {
      persona: {
        select: { id: true, nombre: true, apellido: true, grado: true },
      },
    },
    orderBy: { created_at: "asc" },
  })

  const permisos = session.user.permisos.PERSONAS

  return (
    <ParteDiarioPage
      novedadesIniciales={novedades}
      personas={personas}
      permisos={permisos}
    />
  )
}