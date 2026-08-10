import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import FormularioEscala from "@/components/escalas/FormularioEscala"

export default async function NuevaEscalaPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "ESCALAS", "puede_crear")) {
    return <SinPermisos mensaje="No tenés permiso para crear escalas." />
  }

  return <FormularioEscala />
}