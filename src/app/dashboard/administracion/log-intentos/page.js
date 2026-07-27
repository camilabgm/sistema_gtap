import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { esAdministrador } from "@/lib/autorizacion"
import SinPermisos from "@/components/shared/SinPermisos"
import TablaLogIntentos from  "@/components/administracion/TablaLogIntentos"


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
    orderBy: { created_at: 'desc' },
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Registro de Intentos de Login
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Historial de los últimos 200 intentos de acceso al sistema
        </p>
      </div>
      <TablaLogIntentos intentos={intentosSerializados} />
    </div>
  )
}