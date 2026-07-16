import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import Navbar from "@/components/dashboard/Navbar"
import CerrarSesionAutomatico from "@/components/shared/CerrarSesionAutomatico"
import VerificadorSesion from "@/components/shared/VerificadorSesion"
import DetectorInactividad from "@/components/shared/DetectorInactividad"
import CambioContrasenaObligatorio from "@/components/shared/CambioContrasenaObligatorio"


export default async function DashboardLayout({ children }) {
  const sesion = await getServerSession(authOptions)

  if (!sesion) {
    redirect("/login")
  }

  const usuario = await prisma.usuario.findUnique({
    where:  { id: sesion.user.id },
    select: { sesion_invalidada_en: true, password_temporal: true },
  })

  const sesionDesactualizada = (() => {
    if (!usuario?.sesion_invalidada_en) return false
    const invalidadaEn   = new Date(usuario.sesion_invalidada_en).getTime()
    const tokenEmitidoEn = (sesion.user.token_emitido_en || 0) * 1000
    return invalidadaEn > tokenEmitidoEn
  })()

  return (
    <div className="flex min-h-screen bg-gray-100">

      <Navbar
        nombre={sesion.user.nombre}
        apellido={sesion.user.apellido}
        rol={sesion.user.rol}
      />

      <main className="ml-64 flex-1 p-6">
        {sesionDesactualizada && <CerrarSesionAutomatico />}
        {children}
      </main>

      <VerificadorSesion />
      <DetectorInactividad />
      {usuario?.password_temporal && <CambioContrasenaObligatorio />}

    </div>
  )
}