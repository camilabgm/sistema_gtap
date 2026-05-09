import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import PerfilForm from "@/components/perfil/PerfilForm"

export default async function PerfilPage() {
  const sesion = await getServerSession(authOptions)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-sm text-gray-500 mt-1">
          Información de tu cuenta en el sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-2xl">

        {/* Datos del usuario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Datos de la cuenta
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre</span>
              <span className="font-medium text-gray-900">
                {sesion.user.nombre} {sesion.user.apellido}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Usuario</span>
              <span className="font-medium text-gray-900">{sesion.user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Rol</span>
              <span className="font-medium text-gray-900">{sesion.user.rol}</span>
            </div>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <PerfilForm />

      </div>
    </div>
  )
}