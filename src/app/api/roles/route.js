import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"

export const GET = conPermiso("PERSONAS", "puede_editar", async (request, context, session) => {
  const roles = await prisma.rol.findMany({
    where:   { deleted_at: null },
    orderBy: { nombre: "asc" },
  })

  return NextResponse.json(roles)
})