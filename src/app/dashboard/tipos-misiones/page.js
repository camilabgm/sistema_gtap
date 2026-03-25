import prisma from "@/lib/prisma"
import TiposMisionesTable from "@/components/tipos-misiones/TiposMisionesTable"

// Server Component — consulta la BD directamente
// y pasa los datos ya listos al componente de tabla
export default async function TiposMisionesPage() {

  // Traemos todos los tipos de misiones activos ordenados
  const tiposMisiones = await prisma.tipoMision.findMany({
    where: {
      deleted_at: null
    },
    orderBy: [
      { categoria: "asc" },
      { codigo: "asc" }
    ]
  })

  return (
    <div>
      <TiposMisionesTable tiposMisiones={tiposMisiones} />
    </div>
  )
}