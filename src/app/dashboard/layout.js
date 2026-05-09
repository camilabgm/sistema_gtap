import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { PrismaClient } from "@prisma/client"
import Navbar from "@/components/dashboard/Navbar"
import SesionInvalidadaBanner from "@/components/shared/SesionInvalidadaBanner"

const prisma = new PrismaClient()

export default async function DashboardLayout({ children }) {
  const sesion = await getServerSession(authOptions)

  if (!sesion) {
    redirect("/login")
  }

  // Verificamos si los permisos del usuario fueron actualizados
  // después de que se emitió su token actual
  const usuario = await prisma.usuario.findUnique({
    where:  { id: sesion.user.id },
    select: { sesion_invalidada_en: true },
  })

  const sesionDesactualizada = (() => {
    if (!usuario?.sesion_invalidada_en) return false
    const invalidadaEn    = new Date(usuario.sesion_invalidada_en).getTime()
    const tokenEmitidoEn  = (sesion.user.token_emitido_en || 0) * 1000
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

        {/* Banner visible solo cuando los permisos fueron actualizados */}
        {sesionDesactualizada && <SesionInvalidadaBanner />}

        {children}
      </main>

    </div>
  )
}