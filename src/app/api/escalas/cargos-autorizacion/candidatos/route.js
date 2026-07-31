// Destino: src/app/api/escalas/cargos-autorizacion/candidatos/route.js
//
// GET /api/escalas/cargos-autorizacion/candidatos?rol_autorizador=JEFE_OPERACIONES&orden=1
//
// Devuelve la lista de usuarios candidatos a ocupar una posición (titular
// o adjunto) de un cargo de autorización. El filtro depende de `orden`:
//
//   orden=1 (titular) → solo usuarios activos cuyo Rol actual corresponde
//     exactamente al cargo pedido (ej. Rol="Jefe de Operaciones" para el
//     cargo JEFE_OPERACIONES). El titular ES ese puesto, así que su Rol
//     tiene que coincidir.
//
//   orden=2 (adjunto) → todos los usuarios activos, SIN filtrar por Rol.
//     El adjunto no tiene un Rol equivalente en el sistema — su Rol
//     refleja su función real (Piloto, Copiloto, etc.), no el cargo
//     administrativo que ocupa como respaldo de autorización. Filtrar acá
//     por Rol excluiría al candidato real (caso: Sebastián Morales,
//     adjunto de Jefe de Operaciones, con Rol="Copiloto").
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
    const orden = Number(searchParams.get("orden"))

    const nombreRolEsperado = ROL_NOMBRE_POR_CARGO_AUTORIZACION[rolAutorizador]
    if (!nombreRolEsperado) {
      return NextResponse.json(
        { error: "rol_autorizador inválido o no especificado" },
        { status: 400 }
      )
    }
    if (orden !== 1 && orden !== 2) {
      return NextResponse.json(
        { error: "orden debe ser 1 (titular) o 2 (adjunto)" },
        { status: 400 }
      )
    }

    // Titular: filtrado estricto por Rol. Adjunto: cualquier usuario activo.
    const where =
      orden === 1
        ? { activo: true, rol: { nombre: nombreRolEsperado } }
        : { activo: true }

    const candidatos = await prisma.usuario.findMany({
      where,
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