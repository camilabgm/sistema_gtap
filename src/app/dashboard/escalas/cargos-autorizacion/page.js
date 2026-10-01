import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { esAdministrador } from "@/lib/autorizacion"
import SinPermisos from "@/components/shared/SinPermisos"
import CargosAutorizacionAdmin from "@/components/escalas/CargosAutorizacionAdmin"
import SubNavEscalas from "@/components/escalas/SubNavEscalas"

export default async function CargosAutorizacionPage() {
  const session = await getServerSession(authOptions)

  if (!esAdministrador(session)) {
    return <SinPermisos mensaje="No tenés acceso a la administración de Cargos de Autorización." />
  }

  return (
    <>
      <SubNavEscalas
        permisos={session.user.permisos}
        rol={session.user.rol}
        esCargoDeCascada={session.user.esCargoDeCascada}
      />
      <CargosAutorizacionAdmin />
    </>
  )
}