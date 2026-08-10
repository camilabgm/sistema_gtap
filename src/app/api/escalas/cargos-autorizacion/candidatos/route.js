// Destino: src/app/api/escalas/cargos-autorizacion/candidatos/route.js
//
// GET /api/escalas/cargos-autorizacion/candidatos?rol_autorizador=JEFE_OPERACIONES&orden=1
//
// orden=1 (titular) → solo usuarios activos cuyo Rol actual corresponde
//   exactamente al cargo pedido.
// orden=2 (adjunto) → todos los usuarios activos, sin filtrar por Rol.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conAdmin } from "@/lib/api-helpers"
import { ROL_NOMBRE_POR_CARGO_AUTORIZACION } from "@/lib/autorizacion"

export const GET = conAdmin("ESCALAS", async (request, context, session) => {
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
})