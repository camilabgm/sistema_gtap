"use client"

// Destino: src/components/informes/InformesTabs.js
//
// Contenedor de las 3 pestañas de nivel superior — Vuelos (Grupo 1),
// Totales (Grupo 2), Progreso anual (Grupo 3).

import { useState } from "react"
import InformeVuelos from "./InformeVuelos"
import InformeTotales from "./InformeTotales"
import ProgresoAnual from "./ProgresoAnual"

const GRUPOS = [
  { key: "vuelos", label: "Vuelos" },
  { key: "totales", label: "Totales" },
  { key: "progreso", label: "Progreso anual" },
]

export default function InformesTabs({ aeronaves, tiposMision }) {
  const [grupo, setGrupo] = useState("vuelos")

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Informes</h1>
        <div className="flex gap-1 border-b border-gray-200">
          {GRUPOS.map((g) => (
            <button key={g.key} onClick={() => setGrupo(g.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                grupo === g.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {grupo === "vuelos" && <InformeVuelos aeronaves={aeronaves} tiposMision={tiposMision} />}
      {grupo === "totales" && <InformeTotales />}
      {grupo === "progreso" && <ProgresoAnual />}
    </div>
  )
}