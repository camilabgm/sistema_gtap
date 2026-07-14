import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import FormularioEscala from "@/components/escalas/FormularioEscala"

export default async function NuevaEscalaPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.permisos?.ESCALAS?.puede_crear) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">No tenés permiso para crear escalas.</p>
      </div>
    )
  }

  return <FormularioEscala />
}