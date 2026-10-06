// src/app/dashboard/escalas/historial/page.js
//
// CAMBIO (rama feat/paginacion-servidor): HistorialEscalas va envuelto
// en <Suspense>. Ahora lee los filtros de la URL con useSearchParams, y
// Next 16 exige un límite de Suspense alrededor de cualquier componente
// que lo use (si no, el build puede fallar). El fallback es lo que se
// ve en el instante antes de que el componente arranque.

import { Suspense } from "react"
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
      <Suspense fallback={<p className="p-4 text-sm text-gray-400">Cargando...</p>}>
        <HistorialEscalas
          puedeEditar={tienePermiso(session, "ESCALAS", "puede_editar")}
          puedeEliminar={tienePermiso(session, "ESCALAS", "puede_eliminar")}
        />
      </Suspense>
    </>
  )
}