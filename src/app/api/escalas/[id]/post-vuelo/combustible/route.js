// Destino: src/app/api/escalas/[id]/post-vuelo/combustible/route.js
//
// PATCH — carga o corrige ÚNICAMENTE el campo combustible_consumido de
// un Post-Vuelo ya existente.
//
// CAMBIO sobre la versión anterior: el permiso ya NO se calcula con el
// bit crudo de matriz (session.user.permisos.POST_VUELO.puede_editar)
// — ese bit es el mismo que tienen los 4 roles globales, así que
// "matriz" y "Jefe de Combustible" quedaban indistinguibles entre sí.
// Ahora se chequea por ROL explícito: los 4 globales siempre, Jefe de
// Combustible siempre (por su nombre de rol, no por el bit), y
// Supervisor de Semana solo mientras el campo siga vacío.

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conSesion } from "@/lib/api-helpers"
import { ROLES_GLOBAL_POST_VUELO } from "@/lib/postVuelo"

export const PATCH = conSesion("POST_VUELO", async (request, context, session) => {
  const { id } = await context.params
  const escalaId = parseInt(id, 10)
  if (!Number.isInteger(escalaId) || escalaId <= 0) {
    return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
  }

  const postVuelo = await prisma.postVuelo.findFirst({
    where: { escala_id: escalaId, deleted_at: null },
  })
  if (!postVuelo) {
    return NextResponse.json(
      { error: "Todavía no se cargó el post-vuelo de esta escala — el combustible se completa después." },
      { status: 409 }
    )
  }

  const puedeMatriz = ROLES_GLOBAL_POST_VUELO.includes(session.user.rol)
  const esJefeCombustibleOSupervisor =
    session.user.rol === "Jefe de Combustible" || !!session.user.esSupervisorSemana
  const yaEstaCargado = postVuelo.combustible_consumido !== null

  // Matriz (los 4 roles) puede tocarlo siempre. Jefe de Combustible y
  // Supervisor de Semana solo pueden COMPLETARLO la primera vez — una
  // sola vez cada uno, igual que el resto del Post-Vuelo. Después de
  // cargado, pasa a ser exclusivo de matriz.
  const tienePermiso = puedeMatriz || (esJefeCombustibleOSupervisor && !yaEstaCargado)
  if (!tienePermiso) {
    return NextResponse.json({ error: "No tenés permiso para cargar el combustible de este post-vuelo" }, { status: 403 })
  }

  const body = await request.json()
  const litros = Number(body.combustible_consumido)
  if (body.combustible_consumido === undefined || body.combustible_consumido === null || isNaN(litros) || litros < 0) {
    return NextResponse.json({ error: "El combustible consumido debe ser un número válido" }, { status: 400 })
  }

  const actualizado = await prisma.postVuelo.update({
    where: { id: postVuelo.id },
    data: { combustible_consumido: litros, editado_por: session.user.id },
  })

  return NextResponse.json(actualizado)
})