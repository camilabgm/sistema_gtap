// Destino: src/app/api/sicem/componentes/route.js
//
// GET  /api/sicem/componentes?aeronave_id=&soloAlertas=
// POST /api/sicem/componentes
//
// Un ComponenteMantenimiento representa un MOTOR, HELICE o APU de una
// aeronave puntual — no del tipo de aeronave en general (confirmado:
// el mismo modelo C-208B tiene umbrales distintos entre matrículas).

import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { conPermiso } from "@/lib/api-helpers"
import { calcularHorasDisponibles, necesitaAlerta, motivosAlerta } from "@/lib/sicem"

const TIPOS_VALIDOS = ["MOTOR", "HELICE", "APU"]

function validarCamposComponente(body) {
  if (!body.aeronave_id || !Number.isInteger(Number(body.aeronave_id))) {
    return "La aeronave es obligatoria"
  }

  if (!TIPOS_VALIDOS.includes(body.tipo)) {
    return "El tipo de componente no es válido"
  }

  if (body.umbral_horas_minutos !== undefined && body.umbral_horas_minutos !== null) {
    const umbral = Number(body.umbral_horas_minutos)
    if (!Number.isInteger(umbral) || umbral < 0) return "El umbral de horas no es válido"
  }

  if (body.horas_acumuladas_minutos !== undefined && body.horas_acumuladas_minutos !== null) {
    const horas = Number(body.horas_acumuladas_minutos)
    if (!Number.isInteger(horas) || horas < 0) return "Las horas acumuladas no pueden ser negativas"
  }

  if (body.fecha_proxima_inspeccion) {
    const fecha = new Date(body.fecha_proxima_inspeccion)
    if (isNaN(fecha.getTime())) return "La fecha de próxima inspección no es válida"
    const anio = fecha.getFullYear()
    if (anio < 2000 || anio > 2100) return "La fecha de próxima inspección tiene un año fuera de rango"
  }

  return null
}

// ============================================
// GET — lista componentes, con horas disponibles y alerta calculadas
// ============================================
export const GET = conPermiso("SICEM", "puede_ver", async (request) => {
  const { searchParams } = new URL(request.url)
  const aeronaveId = searchParams.get("aeronave_id")
  const soloAlertas = searchParams.get("soloAlertas") === "true"
  const incluirInactivos = searchParams.get("incluirInactivos") === "true"

  const componentes = await prisma.componenteMantenimiento.findMany({
    where: {
      deleted_at: null,
      ...(incluirInactivos ? {} : { activo: true }),
      ...(aeronaveId ? { aeronave_id: Number(aeronaveId) } : {}),
    },
    include: {
      aeronave: { select: { id: true, matricula: true, tipo: true } },
      _count: { select: { historial: true, eventos: true } },
    },
    orderBy: [{ aeronave_id: "asc" }, { tipo: "asc" }],
  })

  const conCalculo = componentes.map((c) => ({
    ...c,
    horas_disponibles_minutos: calcularHorasDisponibles(c),
    necesita_alerta: necesitaAlerta(c),
    motivos_alerta: motivosAlerta(c),
    // Eliminable si nunca tuvo un Evento real — las ediciones manuales
    // (typos, correcciones mientras se está configurando) NO cuentan
    // para esto, aunque ya hayan generado historial. Lo único que
    // representa algo real es un Evento de Mantenimiento.
    puede_eliminarse: c._count.eventos === 0,
  }))

  const resultado = soloAlertas ? conCalculo.filter((c) => c.necesita_alerta) : conCalculo

  return NextResponse.json(resultado)
})

// ============================================
// POST — crea un componente para una aeronave
// ============================================
export const POST = conPermiso("SICEM", "puede_crear", async (request, context, session) => {
  const body = await request.json()

  const errorValidacion = validarCamposComponente(body)
  if (errorValidacion) {
    return NextResponse.json({ error: errorValidacion }, { status: 400 })
  }

  const aeronaveId = Number(body.aeronave_id)

  const aeronave = await prisma.aeronave.findFirst({
    where: { id: aeronaveId, deleted_at: null },
  })
  if (!aeronave) {
    return NextResponse.json({ error: "La aeronave indicada no existe" }, { status: 404 })
  }

  // Un componente desactivado no cuenta como "ya existe" — desactivar
  // libera el lugar para configurar uno nuevo del mismo tipo. Si lo
  // que se quiere es corregir datos, lo correcto es reactivar y
  // editar (no crear otro), pero el sistema no debe bloquear a quien
  // sí quiere empezar de cero.
  const yaExiste = await prisma.componenteMantenimiento.findFirst({
    where: { aeronave_id: aeronaveId, tipo: body.tipo, deleted_at: null, activo: true },
  })
  if (yaExiste) {
    return NextResponse.json(
      { error: `Esta aeronave ya tiene un componente ${body.tipo} configurado` },
      { status: 409 }
    )
  }

  const componente = await prisma.componenteMantenimiento.create({
    data: {
      aeronave_id: aeronaveId,
      tipo: body.tipo,
      horas_acumuladas_minutos: body.horas_acumuladas_minutos ? Number(body.horas_acumuladas_minutos) : 0,
      umbral_horas_minutos:
        body.umbral_horas_minutos !== undefined && body.umbral_horas_minutos !== null
          ? Number(body.umbral_horas_minutos)
          : null,
      fecha_proxima_inspeccion: body.fecha_proxima_inspeccion ? new Date(body.fecha_proxima_inspeccion) : null,
      creado_por: session.user.id,
    },
  })

  return NextResponse.json(componente, { status: 201 })
})