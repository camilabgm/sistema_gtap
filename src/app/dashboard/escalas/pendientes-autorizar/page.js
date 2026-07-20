import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { esCargoDeCascada } from "@/lib/autorizacion"
import PendientesAutorizar from "@/components/escalas/PendientesAutorizar"

export default async function PendientesAutorizarPage() {
  const session = await getServerSession(authOptions)

  if (!session || !esCargoDeCascada(session.user.rol)) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">
          No tenés acceso a la autorización de escalas.
        </p>
      </div>
    )
  }

  return <PendientesAutorizar />
}