import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import AgendaEscalas from "@/components/escalas/AgendaEscalas"
import SubNavEscalas from "@/components/escalas/SubNavEscalas"

export default async function EscalasPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "ESCALAS", "puede_ver")) {
    return <SinPermisos mensaje="No tenés permiso para ver escalas." />
  }

  return (
    <>
      <SubNavEscalas
        permisos={session.user.permisos}
        rol={session.user.rol}
        esCargoDeCascada={session.user.esCargoDeCascada}
      />
      <AgendaEscalas
        puedeCrear={tienePermiso(session, "ESCALAS", "puede_crear")}
      />
    </>
  )
}