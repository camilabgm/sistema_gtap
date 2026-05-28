import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { PrismaClient } from "@prisma/client"
import ParteDiarioPage from "@/components/parte-diario/ParteDiarioPage"

const prisma = new PrismaClient()

function hoyComoFecha() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
}

export default async function ParteDiarioDashboardPage() {

  const session = await getServerSession(authOptions)

  const personas = await prisma.persona.findMany({
    where:   { activo: true },
    orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    select: {
      id:          true,
      nombre:      true,
      apellido:    true,
      grado:       true,
      escuadron:   true,
      especialidad: true,
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

  const permisos = session?.user?.permisos?.PERSONAS

  return (
    <ParteDiarioPage
      novedadesIniciales={novedades}
      personas={personas}
      permisos={permisos}
    />
  )
}