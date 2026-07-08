// Destino: src/app/api/escalas/route.js
//
// GET  /api/escalas  → lista de escalas para la tabla del panel
// POST /api/escalas  → crea la escala en BORRADOR a partir de la solicitud
//                      (solicitante, fecha, canal, archivo). Todavía sin
//                      aeronave/tipo de misión/itinerario/tripulación —
//                      eso lo completa el PUT de [id].

import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import prisma from "@/lib/prisma"
import { guardarArchivoSolicitud, borrarArchivoSolicitud } from "@/lib/almacenamiento"

const CANALES_VALIDOS = ["WHATSAPP", "PDF", "IMAGEN", "WORD", "VERBAL"]

// Valida los datos de la solicitud (no el archivo en sí — eso lo valida
// guardarArchivoSolicitud, no hace falta duplicarlo acá).
function validarDatosSolicitud({ solicitante, fecha, canal, hayArchivo }) {
  if (!solicitante || !`${solicitante}`.trim()) return "El solicitante es obligatorio"
  if (!fecha) return "La fecha es obligatoria"
  if (isNaN(new Date(fecha).getTime())) return "La fecha no es válida"
  if (!canal) return "El canal es obligatorio"
  if (!CANALES_VALIDOS.includes(canal)) return "El canal no es válido"

  // El archivo es obligatorio salvo cuando el pedido llegó de forma verbal
  if (canal !== "VERBAL" && !hayArchivo) {
    return "Debe adjuntar el archivo de la solicitud (salvo que el canal sea VERBAL)"
  }
  return null
}

// ── GET /api/escalas ───────────────────────────────────────────────────
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    // OJO: asumí "puede_ver" para listar. Si tu permiso de lectura se
    // llama distinto en PermisoRol/PermisoUsuario, avisame y cambio esta
    // línea nomás.
    if (!session.user.permisos?.ESCALAS?.puede_ver) {
      return NextResponse.json({ error: "No tenés permiso para ver escalas" }, { status: 403 })
    }

    const escalas = await prisma.escala.findMany({
      where: { deleted_at: null },
      orderBy: { fecha: "desc" },
      select: {
        id: true,
        nro_orden: true,
        fecha: true,
        solicitante: true,
        estado: true,
        es_borrador: true,
        aeronave: { select: { matricula: true } },
        tipo_mision: { select: { nombre: true } },
      },
    })

    return NextResponse.json(escalas)
  } catch (error) {
    console.error("Error GET escalas:", error)
    return NextResponse.json({ error: "Error interno al listar las escalas" }, { status: 500 })
  }
}

// ── POST /api/escalas ──────────────────────────────────────────────────
// Multipart/form-data (por el archivo). Crea la escala + su fila en
// solicitudes. Si el guardado del archivo falla, se deshace la escala
// recién creada (no puede quedar huérfana sin su solicitud) — es un
// borrado físico a propósito, porque en ese punto la escala nunca llegó
// a existir de verdad para nadie; no es lo mismo que borrar una escala
// real ya en uso, ahí sí corresponde el soft-delete de siempre.
export async function POST(request) {
  let escalaCreada = null
  let rutaGuardada = null

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    if (!session.user.permisos?.ESCALAS?.puede_crear) {
      return NextResponse.json({ error: "No tenés permiso para crear escalas" }, { status: 403 })
    }

    const formData = await request.formData()
    const solicitante   = formData.get("solicitante")
    const fecha         = formData.get("fecha")
    const canal         = formData.get("canal")
    const observaciones = formData.get("observaciones")
    const archivo       = formData.get("archivo")

    // ¿Vino un archivo de verdad? Un campo vacío puede llegar como "" o
    // como un File de 0 bytes; en ambos casos se trata como "sin archivo".
    const hayArchivo =
      archivo && typeof archivo.arrayBuffer === "function" && archivo.size > 0

    const errorValidacion = validarDatosSolicitud({ solicitante, fecha, canal, hayArchivo })
    if (errorValidacion) {
      return NextResponse.json({ error: errorValidacion }, { status: 400 })
    }

    // 1. Crear la escala en borrador
    escalaCreada = await prisma.escala.create({
      data: {
        fecha: new Date(fecha),
        solicitante: solicitante.trim(),
        observaciones: observaciones ? `${observaciones}`.trim() : null,
        es_borrador: true,
        creado_por: session.user.id,
      },
    })

    // 2. Si vino archivo, guardarlo en disco
    let nombreOriginal = null
    if (hayArchivo) {
      try {
        const resultado = await guardarArchivoSolicitud(archivo, escalaCreada.id)
        rutaGuardada = resultado.rutaRelativa
        nombreOriginal = resultado.nombreOriginal
      } catch (errorArchivo) {
        await prisma.escala.delete({ where: { id: escalaCreada.id } })
        return NextResponse.json({ error: errorArchivo.message }, { status: 400 })
      }
    }

    // 3. Crear la fila de la solicitud, ligada a la escala
    await prisma.solicitud.create({
      data: {
        escala_id: escalaCreada.id,
        canal,
        archivo: rutaGuardada,
        nombre_archivo_original: nombreOriginal,
        recibido_por: session.user.id,
        creado_por: session.user.id,
      },
    })

    return NextResponse.json(escalaCreada, { status: 201 })
  } catch (error) {
    console.error("Error POST escalas:", error)

    // Deshacer lo que se haya alcanzado a crear, para no dejar basura
    if (rutaGuardada) {
      await borrarArchivoSolicitud(rutaGuardada).catch(() => {})
    }
    if (escalaCreada) {
      await prisma.escala.delete({ where: { id: escalaCreada.id } }).catch(() => {})
    }

    return NextResponse.json({ error: "Error interno al crear la escala" }, { status: 500 })
  }
}