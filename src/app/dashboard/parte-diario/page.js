// Destino: src/app/dashboard/parte-diario/page.js

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

  // Migrado de PERSONAS.puede_ver a PARTE_DIARIO.puede_ver — este
  // chequeo del lado del servidor es el que de verdad protege la
  // pantalla, incluso si alguien entra por URL directa sin pasar por
  // el sidebar (que ya lo esconde por su cuenta).
  if (!session?.user?.permisos?.PARTE_DIARIO?.puede_ver) {
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

  const permisos = session.user.permisos.PARTE_DIARIO

  return (
    <ParteDiarioPage
      novedadesIniciales={novedades}
      personas={personas}
      permisos={permisos}
    />
  )
}