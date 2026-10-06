// src/lib/exportarProgresoAnualPDF.js
//
// Exporta la tabla de meses — el gráfico de barras en sí no se captura
// (jsPDF no renderiza componentes de React), pero son los mismos
// números que lo alimentan.
//
// CAMBIO (rama fix/pdf-base-comun): usa las piezas compartidas de
// pdf/basePDF.js (encabezado institucional, tabla con autoTable,
// "Página X de Y", márgenes de 15mm). Mismo contenido y mismas
// columnas que antes.

import {
  nuevoDocumentoPDF,
  encabezadoPDF,
  tablaPDF,
  textoFinalPDF,
  pieDePaginaPDF,
  nombreArchivoPDF,
} from "@/lib/basePDF"

// A4 vertical: 180mm útiles.
const COLUMNAS = [
  { titulo: "Mes", ancho: 40 },
  { titulo: "Programados", ancho: 35, alinear: "right" },
  { titulo: "Cumplidos", ancho: 35, alinear: "right" },
  { titulo: "Abortados", ancho: 35, alinear: "right" },
  { titulo: "% Cumplimiento", ancho: 35, alinear: "right" },
]

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

export function exportarProgresoAnualPDF(meses, anio) {
  const doc = nuevoDocumentoPDF({ orientacion: "portrait" })

  const y = encabezadoPDF(doc, {
    titulo: "PROGRESO ANUAL DE ESCALAS",
    filtros: [`Año: ${anio}`],
  })

  const yFinal = tablaPDF(doc, {
    startY: y,
    columnas: COLUMNAS,
    tamanoLetra: 9,
    filas: meses.map((m) => {
      const pct = m.programados > 0 ? Math.round((m.cumplidos / m.programados) * 100) : null
      return [
        NOMBRES_MES[m.mes],
        String(m.programados),
        String(m.cumplidos),
        String(m.abortados),
        pct != null ? `${pct}%` : "—",
      ]
    }),
  })

  const totalProgramados = meses.reduce((acc, m) => acc + m.programados, 0)
  textoFinalPDF(doc, yFinal, `${totalProgramados} escalas programadas en el año`)
  pieDePaginaPDF(doc)

  doc.save(nombreArchivoPDF("progreso-anual", anio))
}