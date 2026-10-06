"use client"

// src/components/administracion/TablaLogIntentos.js
//
// CAMBIO (rama fix/responsive-listados):
//   - El título y el subtítulo se mudan de page.js a este componente,
//     dentro del EncabezadoPagina compartido. Antes page.js dibujaba el
//     título y este componente dibujaba el "Volver a Inicio" DEBAJO, así
//     que en celular quedaba al revés que en el resto de los módulos
//     (título arriba, "Volver" abajo). Ahora el orden es el de siempre.
//   - El buscador ocupa todo el ancho en celular (antes tenía w-64 fijo,
//     256px, que en una pantalla de 320 dejaba el select colgando).
//   - La tabla mantiene su desplazamiento horizontal propio
//     (overflow-x-auto): 4 columnas que se deslizan dentro de su tarjeta.
//
// CAMBIO (rama feat/paginacion-servidor): este componente ya NO filtra.
// Recibe del servidor los 20 intentos de la página, ya filtrados, y
// cada control cambia la URL para que page.js vuelva a consultar:
//   - Buscador: espera ESPERA_BUSQUEDA_MS después de la última tecla y
//     REEMPLAZA la URL (router.replace) — si cada búsqueda quedara en el
//     historial, para salir habría que apretar Atrás muchas veces. Sin
//     mover el scroll mientras se escribe.
//   - Select de resultado y paginación: AGREGAN a la URL (router.push),
//     así Atrás vuelve al filtro o a la página anterior.
//   - Buscador y select vuelven a la página 1. Los valores vacíos no se
//     escriben en la URL (sin filtros queda limpia).
//   - useTransition: mientras el servidor arma la página nueva, la tabla
//     se atenúa y la paginación queda deshabilitada.

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Search } from "lucide-react"
import { formatearFechaHora } from "@/lib/fechaHora"
import { ESPERA_BUSQUEDA_MS } from "@/lib/paginacion"
import EncabezadoPagina from "@/components/shared/EncabezadoPagina"
import BarraPaginacion from "@/components/shared/BarraPaginacion"

const COLORES_RESULTADO = {
  EXITOSO:               "bg-green-100 text-green-800",
  USUARIO_NO_EXISTE:     "bg-red-100 text-red-800",
  CUENTA_INACTIVA:       "bg-yellow-100 text-yellow-800",
  CREDENCIALES_INVALIDAS:"bg-red-100 text-red-800",
  CUENTA_BLOQUEADA:      "bg-orange-100 text-orange-800",
}

const ETIQUETAS_RESULTADO = {
  EXITOSO:               "Exitoso",
  USUARIO_NO_EXISTE:     "Usuario no existe",
  CUENTA_INACTIVA:       "Cuenta inactiva",
  CREDENCIALES_INVALIDAS:"Credenciales inválidas",
  CUENTA_BLOQUEADA:      "Cuenta bloqueada",
}

export default function TablaLogIntentos({ intentos, pagina, totalPaginas, total, filtros }) {
  const router = useRouter()
  const pathname = usePathname()
  const [pendiente, startTransition] = useTransition()

  // Lo que se ve en los controles. Viven en estado propio para poder
  // escribir y elegir sin esperar al servidor.
  const [busqueda, setBusqueda] = useState(filtros.usuario)
  const [resultadoElegido, setResultadoElegido] = useState(filtros.resultado)

  // El último texto de búsqueda que ESTE componente mandó a la URL.
  // Sirve para distinguir dos casos cuando cambia filtros.usuario:
  //   - Es el "eco" de lo que acabamos de mandar → no tocar el buscador
  //     (mientras el servidor respondía, la persona pudo seguir
  //     escribiendo; pisarle el texto le borraría letras).
  //   - Vino de afuera (botón Atrás del navegador) → el buscador tiene
  //     que mostrar lo que dice la URL ahora.
  const ultimaBusquedaEnviada = useRef(filtros.usuario)

  useEffect(() => {
    if (filtros.usuario !== ultimaBusquedaEnviada.current) {
      ultimaBusquedaEnviada.current = filtros.usuario
      setBusqueda(filtros.usuario)
    }
  }, [filtros.usuario])

  useEffect(() => {
    setResultadoElegido(filtros.resultado)
  }, [filtros.resultado])

  // Arma la URL con los filtros y la página, y navega. Lo que no se
  // pasa queda como está en la URL actual, salvo la página: si no se
  // indica, vuelve a 1 (cambiar un filtro siempre arranca de la 1).
  function navegar(
    { usuario = filtros.usuario, resultado = filtros.resultado, pagina: nuevaPagina = 1 },
    { reemplazar = false } = {}
  ) {
    const params = new URLSearchParams()
    if (usuario) params.set("usuario", usuario)
    if (resultado) params.set("resultado", resultado)
    if (nuevaPagina > 1) params.set("pagina", String(nuevaPagina))

    const consulta = params.toString()
    const url = consulta ? `${pathname}?${consulta}` : pathname

    ultimaBusquedaEnviada.current = usuario
    startTransition(() => {
      if (reemplazar) router.replace(url, { scroll: false })
      else router.push(url)
    })
  }

  // Búsqueda diferida: cada tecla reinicia la cuenta; se consulta recién
  // cuando pasan ESPERA_BUSQUEDA_MS sin escribir. Si el texto es el
  // mismo que ya se mandó (ej. se agregó y borró un espacio), no
  // consulta.
  useEffect(() => {
    const valor = busqueda.trim()
    if (valor === ultimaBusquedaEnviada.current) return

    const espera = setTimeout(() => {
      navegar({ usuario: valor }, { reemplazar: true })
    }, ESPERA_BUSQUEDA_MS)
    return () => clearTimeout(espera)
  }, [busqueda]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleCambiarResultado(valor) {
    setResultadoElegido(valor)
    // Si había texto escrito que todavía no se mandó, va junto.
    navegar({ usuario: busqueda.trim(), resultado: valor })
  }

  const hayFiltros = Boolean(filtros.usuario || filtros.resultado)

  return (
    <div>
      <EncabezadoPagina
        volverAInicio
        titulo="Registro de Intentos de Login"
        subtitulo="Historial completo de intentos de acceso al sistema"
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por usuario"
              className="w-full h-10 pl-9 pr-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={resultadoElegido}
            onChange={(e) => handleCambiarResultado(e.target.value)}
            className="h-9 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los resultados</option>
            <option value="EXITOSO">Exitoso</option>
            <option value="CREDENCIALES_INVALIDAS">Credenciales inválidas</option>
            <option value="CUENTA_BLOQUEADA">Cuenta bloqueada</option>
            <option value="USUARIO_NO_EXISTE">Usuario no existe</option>
            <option value="CUENTA_INACTIVA">Cuenta inactiva</option>
          </select>
        </div>
      </EncabezadoPagina>

      <div
        aria-busy={pendiente}
        className={`overflow-x-auto bg-white rounded-lg border border-gray-200 transition-opacity ${pendiente ? "opacity-60" : ""}`}
      >
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs whitespace-nowrap">
                Fecha y hora
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                Usuario
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                Resultado
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-500 uppercase tracking-wider text-xs">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {intentos.map((intento) => (
              <tr key={intento.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {formatearFechaHora(intento.created_at)}
                </td>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {intento.username}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${COLORES_RESULTADO[intento.resultado]}`}
                  >
                    {ETIQUETAS_RESULTADO[intento.resultado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                  {intento.ip}
                </td>
              </tr>
            ))}
            {intentos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  {hayFiltros
                    ? "No se encontraron intentos con estos filtros"
                    : "Todavía no hay intentos de login registrados"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BarraPaginacion
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        unidad={{ singular: "intento", plural: "intentos" }}
        cargando={pendiente}
        onCambiar={(nueva) => navegar({ pagina: nueva })}
      />
    </div>
  )
}