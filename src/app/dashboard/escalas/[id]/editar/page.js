import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import EditarEscala from "@/components/escalas/EditarEscala"

export default async function EditarEscalaPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!session?.user?.permisos?.ESCALAS?.puede_editar) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para editar escalas.</p>
      </div>
    )
  }

  return <EditarEscala escalaId={id} />
}