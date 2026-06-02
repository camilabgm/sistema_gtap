import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { PrismaClient } from "@prisma/client"
import PermisosRolTable from "@/components/administracion/PermisosRolTable"

const prisma = new PrismaClient()

export default async function PermisosPage() {
  const sesion = await getServerSession(authOptions)

  if (sesion.user.rol !== "Comandante") {
    redirect("/dashboard")
  }

  const roles = await prisma.rol.findMany({
    where:   { deleted_at: null },
    include: { permisos_rol: true },
    orderBy: { id: "asc" },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Permisos</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurá qué puede hacer cada rol en cada módulo del sistema.
          Los cambios toman efecto cuando el usuario vuelva a iniciar sesión.
        </p>
      </div>

      <PermisosRolTable roles={roles} />
    </div>
  )
}