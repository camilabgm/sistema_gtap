import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import SinPermisos from "@/components/shared/SinPermisos"
import PendientesAutorizar from "@/components/escalas/PendientesAutorizar"

export default async function PendientesAutorizarPage() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user.esCargoDeCascada) {
    return <SinPermisos mensaje="No tenés acceso a la autorización de escalas." />
  }

  return <PendientesAutorizar />
}