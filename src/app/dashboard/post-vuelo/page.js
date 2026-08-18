import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import PostVueloScreen from "@/components/postVuelo/PostVueloScreen"

// Sin gate por permiso de módulo — cualquier usuario logueado puede
// tener escalas pendientes de reportar como tripulante, tenga o no el
// permiso amplio POST_VUELO. El propio endpoint ya filtra qué le
// corresponde ver a cada quien.
export default async function PostVueloPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-semibold text-gray-900">Sin acceso</h1>
        <p className="mt-2 text-gray-600">Iniciá sesión para ver tus escalas pendientes de reportar.</p>
      </div>
    )
  }

  return <PostVueloScreen />
}