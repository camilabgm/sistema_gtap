import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import AgendaEscalas from "@/components/escalas/AgendaEscalas"

export default async function EscalasPage() {
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
    <AgendaEscalas
      puedeCrear={!!session.user.permisos?.ESCALAS?.puede_crear}
    />
  )
}