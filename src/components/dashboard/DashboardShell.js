"use client"

// src/components/dashboard/DashboardShell.js
//
// CAMBIO (rama fix/responsive-base): el sidebar ahora se comporta
// distinto según el ancho de la pantalla:
//
//   - Menos de 768px: no hay sidebar, está la barra inferior (sin
//     cambios respecto de antes).
//   - 768 a 1279px ("menú flotante"): arranca CERRADO, mostrando ícono
//     + nombre corto. Al abrirlo, se dibuja ENCIMA de la página, con un
//     fondo gris detrás — la página no se corre ni se achica, así las
//     tablas no se aplastan. Se cierra solo al tocar el fondo gris o
//     al navegar a otra pantalla.
//   - 1280px o más: igual que siempre — arranca abierto y, al abrirlo
//     o cerrarlo, empuja la página.
//
// Cómo se decide si está cerrado o abierto, sin parpadeos:
//   colapsadoManual = null  → nadie tocó ☰: manda el ancho de pantalla
//                             (cerrado si flota, abierto si no).
//   colapsadoManual = true/false → la persona eligió con ☰.
// Al cambiar de pantalla (con menú flotante) o al cruzar los 1280px,
// se vuelve a null — o sea, al comportamiento por defecto de ese ancho.
// Se calcula en el mismo render, no con un efecto que corrija después:
// así el sidebar nunca aparece abierto un instante antes de cerrarse.

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Navbar from "./Navbar"
import BarraNavegacionInferior from "@/components/shared/BarraNavegacionInferior"
import { useDeviceType, useMenuFlotante } from "@/hooks/useDeviceType"

export default function DashboardShell({ nombre, apellido, rol, permisos, esCargoDeCascada, esSupervisorSemana, children }) {
  const esMobile     = useDeviceType()
  const menuFlotante = useMenuFlotante()
  const pathname     = usePathname()

  const [colapsadoManual, setColapsadoManual] = useState(null)

  const colapsado = colapsadoManual ?? (menuFlotante === true)
  // El sidebar está "flotando" cuando el ancho es de menú flotante y
  // la persona lo abrió — ahí se dibuja el fondo gris y la sombra.
  const flotando = menuFlotante === true && !colapsado

  // Al cruzar los 1280px (agrandar o achicar la ventana), se descarta
  // la elección manual y vuelve el comportamiento por defecto del
  // nuevo ancho.
  useEffect(() => {
    setColapsadoManual(null)
  }, [menuFlotante])

  // Con menú flotante, elegir un módulo lo cierra (vuelve al default,
  // que en ese ancho es cerrado). Desde 1280px no se toca: si alguien
  // cerró el sidebar a mano, sigue cerrado mientras navega, como antes.
  useEffect(() => {
    if (menuFlotante) setColapsadoManual(null)
  }, [pathname, menuFlotante])

  // Mientras alguno de los dos hooks es null (primerísimo instante de
  // montaje), no se monta ninguna navegación — el contenido se muestra
  // igual, sin margen ni padding especial, hasta que resuelvan. Evita
  // el parpadeo del sidebar en un celular, o del sidebar abierto en
  // una tablet antes de cerrarse.
  const mostrarSidebar = esMobile === false && menuFlotante !== null

  // Margen de la página según el sidebar:
  // - Menú flotante: siempre el ancho del sidebar cerrado (80px), esté
  //   abierto o no — abierto flota encima, no empuja.
  // - Desde 1280px: 80px cerrado o 256px abierto, como antes.
  let claseMargenDesktop = ""
  if (mostrarSidebar) {
    claseMargenDesktop = menuFlotante || colapsado ? "ml-20" : "ml-64"
  }
  // pb-20 le da lugar al contenido para no quedar tapado detrás de la
  // barra inferior fija (más su safe-area-inset-bottom).
  const clasePaddingMobile = esMobile === true ? "pb-20" : ""

  return (
    <>
      {mostrarSidebar && (
        <Navbar
          nombre={nombre}
          apellido={apellido}
          rol={rol}
          permisos={permisos}
          esCargoDeCascada={esCargoDeCascada}
          esSupervisorSemana={esSupervisorSemana}
          colapsado={colapsado}
          flotando={flotando}
          onToggleColapsado={() => setColapsadoManual(!colapsado)}
        />
      )}

      {/* Fondo gris detrás del sidebar flotante — tocarlo lo cierra.
          z-30: queda debajo del sidebar (z-40) y encima de la página. */}
      {flotando && (
        <div
          className="fixed inset-0 z-30 bg-black/30"
          onClick={() => setColapsadoManual(true)}
          aria-hidden="true"
        />
      )}

      {esMobile === true && (
        <BarraNavegacionInferior
          rol={rol}
          permisos={permisos}
          esCargoDeCascada={esCargoDeCascada}
        />
      )}

      {/* min-w-0 — main es un ítem de flexbox (hijo directo del div
          flex de DashboardLayout, porque este componente retorna un
          fragmento). Sin esto, un ítem de flexbox tiene un ancho mínimo
          automático igual al de su contenido más ancho — una tabla
          grande o un gráfico empujaban TODO el layout a desbordar hacia
          la derecha, en vez de que el overflow-x-auto de la tabla
          contuviera el desborde ahí adentro.

          CAMBIO: p-2 en celular, p-6 desde 640px. Antes era p-6 siempre
          — sumado al p-4 de cada página y al p-5 de cada tarjeta, en un
          celular de 320px quedaban apenas 200px útiles. Cada página ya
          tiene su propio p-4, así que el margen total al borde de la
          pantalla queda en 24px por lado, lo normal en una app. */}
      <main className={`min-w-0 flex-1 p-2 sm:p-6 transition-all duration-200 ${claseMargenDesktop} ${clasePaddingMobile}`}>
        {children}
      </main>
    </>
  )
}