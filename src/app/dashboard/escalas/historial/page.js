import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import HistorialEscalas from "@/components/escalas/HistorialEscalas"
import SubNavEscalas from "@/components/escalas/SubNavEscalas"

export default async function HistorialEscalasPage() {
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
      <HistorialEscalas
        puedeEditar={tienePermiso(session, "ESCALAS", "puede_editar")}
        puedeEliminar={tienePermiso(session, "ESCALAS", "puede_eliminar")}
      />
    </>
  )
}