"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { yaPasoLaHora } from "@/lib/escalas"

// Único lugar que calcula los 4 contadores de "pendientes" que se
// muestran como badges en el sistema — antes vivían duplicados dentro
// de Navbar.js. La rama de responsive va a reusar este mismo hook
// desde la barra de navegación de mobile, en vez de repetir estos 4
// fetches por tercera vez. Mismo criterio de filtrado de siempre:
// yaPasoLaHora para escalas por autorizar, te_corresponde para
// post-vuelo (que ya cubre tripulación, Supervisor de Semana y Jefe
// de Combustible, calculado del lado del servidor).
export function useBadgesDashboard(permisos, esCargoDeCascada) {
  const pathname = usePathname()

  const [acusesParaMi, setAcusesParaMi] = useState(0)
  const [pendientesParaMi, setPendientesParaMi] = useState(0)
  const [postVueloParaMi, setPostVueloParaMi] = useState(0)
  const [alertasSicem, setAlertasSicem] = useState(0)

  useEffect(() => {
    if (!esCargoDeCascada) { setPendientesParaMi(0); return }
    fetch("/api/escalas/pendientes-autorizar", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!data?.podesActuar) { setPendientesParaMi(0); return }
        const accionables = (data.escalas || []).filter((e) => !yaPasoLaHora(e.hora_despegue_estimada))
        setPendientesParaMi(accionables.length)
      })
      .catch(() => {})
  }, [pathname, esCargoDeCascada])

  useEffect(() => {
    fetch("/api/post-vuelo", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const cantidad = Array.isArray(data) ? data.filter((e) => e.te_corresponde).length : 0
        setPostVueloParaMi(cantidad)
      })
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    fetch("/api/acuses/pendientes", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAcusesParaMi(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (!permisos?.SICEM?.puede_ver) { setAlertasSicem(0); return }
    fetch("/api/sicem/componentes?soloAlertas=true", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setAlertasSicem(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [pathname, permisos])

  return { acusesParaMi, pendientesParaMi, postVueloParaMi, alertasSicem }
}