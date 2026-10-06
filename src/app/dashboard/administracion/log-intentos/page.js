// src/app/dashboard/administracion/log-intentos/page.js
//
// CAMBIO (rama fix/responsive-listados): el título y el subtítulo se
// mudan a TablaLogIntentos, dentro del EncabezadoPagina compartido —
// así el "Volver a Inicio" de celular queda arriba del título, como en
// el resto de los módulos. El contenedor pasa de p-6 a p-4, igual que
// las demás páginas (el padding general ya lo pone DashboardShell).
//
// CAMBIO (rama feat/paginacion-servidor): paginado y filtrado en el
// servidor. Antes traía los últimos 200 intentos con take: 200 y la
// tabla filtraba en el navegador — el intento 201 en adelante no se
// veía NUNCA, ni buscándolo. Ahora:
//   - Lee de la URL ?pagina=, ?usuario= y ?resultado=. En Next 16 los
//     searchParams llegan como promesa: primero hay que hacerles await.
//   - Filtra con Prisma (usuario sin distinguir mayúsculas, resultado
//     exacto) y trae solo los 20 de la página pedida.
//   - Se elimina el límite de 200: se puede llegar a todo el historial.

import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { ResultadoLogin } from "@prisma/client"
import { esAdministrador } from "@/lib/autorizacion"
import { leerPagina, datosPaginacion } from "@/lib/paginacion"
import SinPermisos from "@/components/shared/SinPermisos"
import TablaLogIntentos from "@/components/administracion/TablaLogIntentos"

// Los valores válidos salen del enum que genera Prisma a partir del
// schema — no se copian a mano. Si mañana se agrega un resultado nuevo
// al enum, esta lista se actualiza sola.
const RESULTADOS_VALIDOS = Object.values(ResultadoLogin)

// Un parámetro de la URL puede llegar como texto, como lista (si se
// repite: ?usuario=a&usuario=b) o no llegar. Siempre devuelve texto.
function textoParam(valor) {
  const texto = Array.isArray(valor) ? valor[0] : valor
  return typeof texto === "string" ? texto.trim() : ""
}

export default async function LogIntentosPage({ searchParams }) {
  // Verificar que el usuario esté logueado
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Solo Comandante y Jefe de Operaciones pueden ver el registro de
  // intentos de login. El chequeo va ANTES de cualquier consulta.
  if (!esAdministrador(session)) {
    return <SinPermisos mensaje="No tenés acceso al registro de intentos de login." />
  }

  const params = await searchParams

  const paginaPedida = leerPagina(params.pagina)
  const usuario = textoParam(params.usuario)

  // Si alguien escribe a mano ?resultado=CUALQUIERCOSA, Prisma tiraría
  // un error 500 (ese valor no existe en el enum). Un valor inválido se
  // ignora y se muestran todos los resultados.
  const resultadoPedido = textoParam(params.resultado)
  const resultado = RESULTADOS_VALIDOS.includes(resultadoPedido) ? resultadoPedido : ""

  const where = {}
  if (usuario) where.username = { contains: usuario, mode: "insensitive" }
  if (resultado) where.resultado = resultado

  // Primero el total (para saber cuántas páginas hay y si la pedida
  // existe), después solo los registros de esa página.
  const total = await prisma.logIntentoLogin.count({ where })
  const { pagina, totalPaginas, skip, take } = datosPaginacion(paginaPedida, total)

  const intentos = await prisma.logIntentoLogin.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take,
  })

  // Convertir las fechas a texto para poder pasarlas al Client Component
  // Los Server Components pasan datos al Client Component como "props",
  // y las props solo pueden ser texto, números o booleanos — no objetos Date
  const intentosSerializados = intentos.map((intento) => ({
    id:         intento.id,
    username:   intento.username,
    resultado:  intento.resultado,
    ip:         intento.ip,
    created_at: intento.created_at.toISOString(),
  }))

  return (
    <div className="p-4">
      <TablaLogIntentos
        intentos={intentosSerializados}
        pagina={pagina}
        totalPaginas={totalPaginas}
        total={total}
        filtros={{ usuario, resultado }}
      />
    </div>
  )
}