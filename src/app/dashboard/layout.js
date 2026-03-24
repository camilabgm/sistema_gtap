import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import Navbar from "@/components/dashboard/Navbar"

export default async function DashboardLayout({ children }) {
  // Leemos la sesión directamente en el servidor
  // Si no hay sesión, redirigimos al login
  const sesion = await getServerSession(authOptions)

  if (!sesion) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Navbar lateral — recibe los datos del usuario como props */}
      <Navbar
        nombre={sesion.user.nombre}
        apellido={sesion.user.apellido}
        rol={sesion.user.rol}
        nivel={sesion.user.nivel}
      />

      {/* Contenido principal — el ml-64 deja espacio para el navbar fijo */}
      <main className="ml-64 flex-1 p-6">
        {children}
      </main>

    </div>
  )
}