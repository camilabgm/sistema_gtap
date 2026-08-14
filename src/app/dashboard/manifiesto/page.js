// src/app/dashboard/manifiesto/page.js
//
// Server Component — solo valida permiso de VER y decide si muestra la
// pantalla o el mensaje de "sin permisos". El resto (fetch, estado,
// interacción) vive en ManifiestoScreen (Client Component).

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import SinPermisos from "@/components/shared/SinPermisos"
import ManifiestoScreen from "@/components/manifiesto/ManifiestoScreen"

export default async function ManifiestoPage() {
  const session = await getServerSession(authOptions)

  if (!tienePermiso(session, "MANIFIESTO", "puede_ver")) {
    return <SinPermisos mensaje="No tenés permiso para ver el módulo de Manifiesto." />
  }

  return <ManifiestoScreen session={session} />
}