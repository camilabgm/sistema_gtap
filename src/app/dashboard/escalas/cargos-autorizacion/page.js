import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { esAdministrador } from "@/lib/autorizacion"
import SinPermisos from "@/components/shared/SinPermisos"
import CargosAutorizacionAdmin from "@/components/escalas/CargosAutorizacionAdmin"

export default async function CargosAutorizacionPage() {
  const session = await getServerSession(authOptions)

  if (!esAdministrador(session)) {
    return <SinPermisos mensaje="No tenés acceso a la administración de Cargos de Autorización." />
  }

  return <CargosAutorizacionAdmin />
}