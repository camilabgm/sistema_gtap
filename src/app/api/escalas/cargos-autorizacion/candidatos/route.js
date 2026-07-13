// Destino: src/app/api/escalas/cargos-autorizacion/candidatos/route.js
//
// GET /api/escalas/cargos-autorizacion/candidatos?rol_autorizador=JEFE_OPERACIONES
//
// Devuelve la lista de usuarios activos cuyo Rol actual corresponde al
// cargo de autorización pedido. Es el endpoint que alimenta el buscador
// de la pantalla de administración de Cargos de Autorización — filtrado
// en el origen para que sea imposible asignar como titular/adjunto a
// alguien cuyo Rol no corresponde.
//
// Reusa el mapeo ROL_NOMBRE_POR_CARGO_AUTORIZACION de lib/autorizacion.js
// en vez de tener su propia copia — es el mismo mapeo que usa la cascada.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { esAdministrador, ROL_NOMBRE_POR_CARGO_AUTORIZACION } from "@/lib/autorizacion"

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions)
    if (!esAdministrador(session)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const rolAutorizador = searchParams.get("rol_autorizador")

    const nombreRolEsperado = ROL_NOMBRE_POR_CARGO_AUTORIZACION[rolAutorizador]
    if (!nombreRolEsperado) {
      return NextResponse.json(
        { error: "rol_autorizador inválido o no especificado" },
        { status: 400 }
      )
    }

    const candidatos = await prisma.usuario.findMany({
      where: {
        activo: true,
        rol: { nombre: nombreRolEsperado },
      },
      select: {
        id: true,
        persona: { select: { nombre: true, apellido: true, grado: true } },
      },
      orderBy: { persona: { apellido: "asc" } },
    })

    return NextResponse.json(candidatos)
  } catch (error) {
    console.error("Error GET candidatos cargos-autorizacion:", error)
    return NextResponse.json({ error: "Error al obtener candidatos" }, { status: 500 })
  }
}