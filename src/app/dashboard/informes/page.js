// Destino: src/app/dashboard/informes/page.js
//
// CAMBIO: usa tienePermiso() + SinPermisos, igual que el resto de los
// módulos — antes tenía la condición escrita a mano
// (session?.user?.permisos?.INFORMES?.puede_ver), que hacía lo mismo
// pero por fuera de la función compartida. Mismo comportamiento,
// ahora consistente con todo lo demás.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import InformesTabs from "@/components/informes/InformesTabs"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"

export default async function InformesPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "INFORMES", "puede_ver")) {
    return <SinPermisos mensaje="No tenés permiso para ver los informes." />
  }

  const [aeronaves, tiposMision] = await Promise.all([
    prisma.aeronave.findMany({
      where: { activo: true, deleted_at: null },
      orderBy: { matricula: "asc" },
      select: { id: true, matricula: true },
    }),
    prisma.tipoMision.findMany({
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, nombre: true },
    }),
  ])

  return <InformesTabs aeronaves={aeronaves} tiposMision={tiposMision} />
}