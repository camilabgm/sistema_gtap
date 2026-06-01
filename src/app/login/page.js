"use client"
// src/app/login/page.js

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {

  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error,    setError]    = useState("")
  const [cargando, setCargando] = useState(false)

  async function handleLogin() {
    if (cargando) return
    setCargando(true)
    setError("")

    const resultado = await signIn("credentials", {
      username,
      password,
      redirect: false,
    })

    if (resultado?.error) {
      setError(
        resultado.error === "CredentialsSignin"
          ? "Usuario o contraseña incorrectos"
          : resultado.error
      )
      setCargando(false)
      return
    }

    router.push("/dashboard")
  }

  // Enter en cualquiera de los dos campos dispara el login
  function handleKeyDown(e) {
    if (e.key === "Enter") handleLogin()
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Sistema GTAP</h1>
          <p className="text-gray-500 text-sm mt-1">
            Grupo de Transporte Aéreo Presidencial
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Usuario
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ingrese su usuario"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ingrese su contraseña"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={cargando}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition disabled:opacity-50"
        >
          {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
        </button>

      </div>
    </div>
  )
}
