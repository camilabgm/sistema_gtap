"use client"

import { useState } from "react"
import Navbar from "./Navbar"
import BarraNavegacionInferior from "@/components/shared/BarraNavegacionInferior"
import { useDeviceType } from "@/hooks/useDeviceType"

export default function DashboardShell({ nombre, apellido, rol, permisos, esCargoDeCascada, esSupervisorSemana, children }) {
  const [colapsado, setColapsado] = useState(false)
  const esMobile = useDeviceType()

  // Mientras esMobile es null (primerísimo instante de montaje en el
  // cliente), no se monta NI Navbar NI la barra de mobile — el
  // contenido (children) se muestra igual, sin margen ni padding
  // especial, hasta que el hook resuelva. Evita el parpadeo del
  // sidebar de escritorio en una pantalla de celular.
  const claseMargenDesktop = esMobile === false ? (colapsado ? "ml-16" : "ml-64") : ""
  // pb-20 le da lugar al contenido para no quedar tapado detrás de la
  // barra inferior fija (más su safe-area-inset-bottom).
  const clasePaddingMobile = esMobile === true ? "pb-20" : ""

  return (
    <>
      {esMobile === false && (
        <Navbar
          nombre={nombre}
          apellido={apellido}
          rol={rol}
          permisos={permisos}
          esCargoDeCascada={esCargoDeCascada}
          esSupervisorSemana={esSupervisorSemana}
          colapsado={colapsado}
          onToggleColapsado={() => setColapsado((c) => !c)}
        />
      )}

      {esMobile === true && (
        <BarraNavegacionInferior
          rol={rol}
          permisos={permisos}
          esCargoDeCascada={esCargoDeCascada}
        />
      )}

      {/* FIX: min-w-0 — main es un ítem de flexbox (hijo directo del
          div flex de DashboardLayout, porque este componente retorna
          un fragmento). Sin esto, un ítem de flexbox tiene un ancho
          mínimo automático igual al de su contenido más ancho — una
          tabla grande o un gráfico empujaban TODO el layout (main
          entero, con navegación y título incluidos) a desbordar hacia
          la derecha, en vez de que el overflow-x-auto de la tabla
          contuviera el desborde ahí adentro. Con min-w-0, main puede
          encogerse al ancho real de la pantalla, y cada contenedor
          interno con su propio scroll horizontal vuelve a funcionar
          como corresponde — esto corrige el problema de raíz para
          cualquier página del sistema con contenido ancho, no solo
          Informes. */}
      <main className={`min-w-0 flex-1 p-6 transition-all duration-200 ${claseMargenDesktop} ${clasePaddingMobile}`}>
        {children}
      </main>
    </>
  )
}