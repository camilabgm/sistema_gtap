import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import HistorialEscalas from "@/components/escalas/HistorialEscalas"

export default async function HistorialEscalasPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.permisos?.ESCALAS?.puede_ver) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para ver escalas.</p>
      </div>
    )
  }

  return (
    <HistorialEscalas
      puedeEditar={!!session.user.permisos?.ESCALAS?.puede_editar}
      puedeEliminar={!!session.user.permisos?.ESCALAS?.puede_eliminar}
    />
  )
}