// src/app/dashboard/administracion/log-intentos/page.js
//
// CAMBIO (rama fix/responsive-listados): el título y el subtítulo se
// mudan a TablaLogIntentos, dentro del EncabezadoPagina compartido —
// así el "Volver a Inicio" de celular queda arriba del título, como en
// el resto de los módulos. El contenedor pasa de p-6 a p-4, igual que
// las demás páginas (el padding general ya lo pone DashboardShell).

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { esAdministrador } from "@/lib/autorizacion"
import SinPermisos from "@/components/shared/SinPermisos"
import TablaLogIntentos from "@/components/administracion/TablaLogIntentos"

export default async function LogIntentosPage() {
  // Verificar que el usuario esté logueado
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Solo Comandante y Jefe de Operaciones pueden ver el registro de intentos de login
  if (!esAdministrador(session)) {
    return <SinPermisos mensaje="No tenés acceso al registro de intentos de login." />
  }

  // Traer los últimos 200 intentos de login, del más reciente al más viejo
  const intentos = await prisma.logIntentoLogin.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
  })

  // Convertir las fechas a texto para poder pasarlas al Client Component
  // Los Server Components pasan datos al Client Component como "props",
  // y las props solo pueden ser texto, números o booleanos — no objetos Date
  const intentosSerializados = intentos.map((intento) => ({
    id:         intento.id,
    username:   intento.username,
    resultado:  intento.resultado,
    ip:         intento.ip,
    created_at: intento.created_at.toISOString(),
  }))

  return (
    <div className="p-4">
      <TablaLogIntentos intentos={intentosSerializados} />
    </div>
  )
}