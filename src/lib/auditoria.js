// src/lib/auditoria.js
//
// creado_por, editado_por, autorizada_por, manifiesto_cerrado_por, etc.
// son Int? sueltos en el schema — no relaciones de Prisma hacia
// Usuario. Ningún include/select los resuelve a nombre solo; hay que
// hacerlo a mano, acá, en una sola consulta por lote para no pegarle a
// la base una vez por cada id.

import prisma from "@/lib/prisma"

// Recibe una lista de ids de Usuario (puede tener null, undefined y
// repetidos mezclados — se filtran y deduplican acá) y devuelve un mapa
// { id: "Grado Apellido, Nombre" }.
export async function resolverNombresUsuarios(ids) {
  const idsUnicos = [...new Set(ids.filter((id) => id !== null && id !== undefined))]
  if (idsUnicos.length === 0) return {}

  const usuarios = await prisma.usuario.findMany({
    where: { id: { in: idsUnicos } },
    select: {
      id: true,
      persona: { select: { grado: true, apellido: true, nombre: true } },
    },
  })

  const mapa = {}
  for (const u of usuarios) {
    mapa[u.id] = u.persona
      ? `${u.persona.grado} ${u.persona.apellido}, ${u.persona.nombre}`
      : `Usuario #${u.id}` // por si el usuario fue borrado del todo, no debería pasar
  }
  return mapa
}