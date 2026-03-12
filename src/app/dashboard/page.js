"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Sistema GTAP</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session?.user?.nombre} {session?.user?.apellido} — {session?.user?.rol}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="p-6">
        <h2 className="text-2xl font-semibold text-gray-700">
          Bienvenido, {session?.user?.nombre}
        </h2>
        <p className="text-gray-500 mt-1">
          Nivel de acceso: {session?.user?.nivel} — {session?.user?.rol}
        </p>
      </main>
    </div>
  );
}