// Destino: src/app/dashboard/escalas/cargos-autorizacion/page.js
//
// Server Component: verifica esAdministrador() ANTES de renderizar nada.
// Si alguien sin permiso entra por URL directa, ve el mensaje de "sin
// permisos" en vez de la pantalla — la protección no depende de que el
// botón esté oculto en el menú.

import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { esAdministrador } from "@/lib/autorizacion"
import CargosAutorizacionAdmin from "@/components/escalas/CargosAutorizacionAdmin"

export default async function CargosAutorizacionPage() {
  const session = await getServerSession(authOptions)

  if (!esAdministrador(session)) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin permisos</h1>
        <p className="mt-2 text-gray-600">
          No tenés acceso a la administración de Cargos de Autorización.
        </p>
      </div>
    )
  }

  return <CargosAutorizacionAdmin />
}