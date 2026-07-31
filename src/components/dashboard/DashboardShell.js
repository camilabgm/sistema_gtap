"use client"

import { useState } from "react"
import Navbar from "./Navbar"

export default function DashboardShell({ nombre, apellido, rol, permisos, esCargoDeCascada, children }) {
  const [colapsado, setColapsado] = useState(false)

  return (
    <>
      <Navbar
        nombre={nombre}
        apellido={apellido}
        rol={rol}
        permisos={permisos}
        esCargoDeCascada={esCargoDeCascada}
        colapsado={colapsado}
        onToggleColapsado={() => setColapsado((c) => !c)}
      />
      <main className={`flex-1 p-6 transition-all duration-200 ${colapsado ? "ml-16" : "ml-64"}`}>
        {children}
      </main>
    </>
  )
}