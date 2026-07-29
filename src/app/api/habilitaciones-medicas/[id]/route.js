// src/app/api/habilitaciones-medicas/[id]/route.js
import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conAdmin } from "@/lib/api-helpers"

export const DELETE = conAdmin("HABILITACIONES_MEDICAS", async (request, { params }, session) => {
  const { id } = await params

  await prisma.habilitacionMedica.update({
    where: { id: parseInt(id) },
    data: {
      deleted_at:    new Date(),
      eliminado_por: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
})