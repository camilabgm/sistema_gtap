import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import EditarEscala from "@/components/escalas/EditarEscala"

export default async function EditarEscalaPage({ params }) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "ESCALAS", "puede_editar")) {
    return <SinPermisos mensaje="No tenés permiso para editar escalas." />
  }

  return <EditarEscala escalaId={id} />
}