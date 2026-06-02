import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
  const sesion = await getServerSession(authOptions)

  if (!sesion) return NextResponse.json({ invalida: true })

  const usuario = await prisma.usuario.findUnique({
    where:  { id: sesion.user.id },
    select: { sesion_invalidada_en: true },
  })

  const invalida = (() => {
    if (!usuario?.sesion_invalidada_en) return false
    const invalidadaEn   = new Date(usuario.sesion_invalidada_en).getTime()
    const tokenEmitidoEn = (sesion.user.token_emitido_en || 0) * 1000
    return invalidadaEn > tokenEmitidoEn
  })()

  return NextResponse.json({ invalida })
}