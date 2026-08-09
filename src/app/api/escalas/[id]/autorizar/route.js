// Destino: src/app/api/escalas/[id]/autorizar/route.js
//
// PUT /api/escalas/<id>/autorizar
//
// Recalcula EN VIVO quién es el autorizante activo y, si quien llama es
// esa persona, marca la escala como autorizada. Rechaza si ya pasó la
// hora estimada de despegue sin autorizar.
//
// Al autorizar, crea el Acuse de Recibo pendiente para:
//   - cada tripulante (Piloto/Copiloto/Técnico de Vuelo), vía EscalaTripulacion
//   - quien tenga el Rol de acceso "Supervisor de Semana" en este momento
//
// Esto es SOLO el acuse liviano ("me enteré de que existe esta escala")
// — no reemplaza el checklist de Inspección Pre-vuelo (25 ítems, firma
// física), que sigue diferido a la Fase 2 y es una pieza aparte.

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { calcularAutorizanteActivo } from "@/lib/cascadaAutorizacion"
import { yaPasoLaHora } from "@/lib/escalas"

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params
    const escalaId = parseInt(id, 10)
    if (!Number.isInteger(escalaId) || escalaId <= 0) {
      return NextResponse.json({ error: "Id de escala inválido" }, { status: 400 })
    }

    const escala = await prisma.escala.findFirst({
      where: { id: escalaId, deleted_at: null },
      select: {
        es_borrador: true,
        autorizada: true,
        estado: true,
        hora_despegue_estimada: true,
        tripulacion: {
          where: { deleted_at: null },
          select: { persona_id: true, rol_en_vuelo: true },
        },
      },
    })
    if (!escala) {
      return NextResponse.json({ error: "Escala no encontrada" }, { status: 404 })
    }
    if (escala.es_borrador) {
      return NextResponse.json({ error: "La escala todavía es un borrador" }, { status: 409 })
    }
    if (escala.autorizada) {
      return NextResponse.json({ error: "La escala ya está autorizada" }, { status: 409 })
    }
    if (["ABORTADA", "RECHAZADA"].includes(escala.estado)) {
      return NextResponse.json({ error: "La escala ya no está disponible para autorizar" }, { status: 409 })
    }
    if (yaPasoLaHora(escala.hora_despegue_estimada)) {
      return NextResponse.json(
        { error: "Ya pasó la hora de despegue estimada. Editá la escala para reprogramarla antes de autorizarla." },
        { status: 409 }
      )
    }

    const { autorizanteRol, autorizantePersonaId, pasos } = await calcularAutorizanteActivo()

    if (!autorizantePersonaId || autorizantePersonaId !== session.user.personaId) {
      return NextResponse.json(
        { error: "No sos el autorizante activo en este momento" },
        { status: 403 }
      )
    }

    // Quién tiene hoy el Rol de acceso "Supervisor de Semana" — no
    // depende de ningún módulo de guardia rotativa, se lee directo de
    // la asignación de Rol que ya administrás vos misma. Puede no haber
    // nadie (Rol vacante) — en ese caso, simplemente no se crea ese acuse.
    const supervisoresDeSemana = await prisma.usuario.findMany({
      where: { activo: true, deleted_at: null, rol: { nombre: "Supervisor de Semana" } },
      select: { persona_id: true },
    })

    const actualizada = await prisma.$transaction(async (tx) => {
      for (let i = 0; i < pasos.length; i++) {
        const paso = pasos[i]
        await tx.escalaAutorizacion.create({
          data: {
            escala_id: escalaId,
            rol_autorizador: paso.rol_autorizador,
            persona_id: paso.persona_id,
            motivo_escalamiento: paso.motivo_escalamiento,
            autorizo: i === pasos.length - 1,
            creado_por: session.user.id,
          },
        })
      }

      const resultado = await tx.escala.update({
        where: { id: escalaId },
        data: {
          autorizada: true,
          autorizada_por: session.user.id,
          rol_autoriza: autorizanteRol,
          fecha_autorizacion: new Date(),
          editado_por: session.user.id,
        },
      })

      const acusesACrear = [
        ...escala.tripulacion.map((t) => ({
          escala_id: escalaId,
          persona_id: t.persona_id,
          rol: t.rol_en_vuelo, // mismos valores que RolAcuse
          creado_por: session.user.id,
        })),
        ...supervisoresDeSemana.map((u) => ({
          escala_id: escalaId,
          persona_id: u.persona_id,
          rol: "SUPERVISOR_SEMANA",
          creado_por: session.user.id,
        })),
      ]

      if (acusesACrear.length > 0) {
        await tx.acuseRecibo.createMany({ data: acusesACrear, skipDuplicates: true })
      }

      return resultado
    })

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error("Error PUT autorizar escala:", error)
    return NextResponse.json({ error: "Error interno al autorizar la escala" }, { status: 500 })
  }
}