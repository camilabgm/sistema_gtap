// Destino: src/lib/exportarProgresoAnualPDF.js
//
// Mismo criterio visual que los otros exportadores de Informes.
// Exporta la tabla de meses — el gráfico de barras en sí no se
// captura (jsPDF no renderiza componentes de React, solo dibuja
// texto/formas propias), pero son los mismos números que lo alimentan.

import { jsPDF } from "jspdf"

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

const ALTO_LINEA = 4.5
const COLOR_BANDA_ENCABEZADO = [30, 58, 95]
const COLOR_CEBRA = [245, 246, 248]

export function exportarProgresoAnualPDF(meses, anio) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const margen = 15
  const anchoUtil = 210 - margen * 2
  const altoHoja = 297
  let y = 20
  let numeroPagina = 1

  function dibujarEncabezadoPagina() {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(20, 20, 20)
    doc.text("PROGRESO ANUAL DE ESCALAS", margen, y)

    doc.setDrawColor(...COLOR_BANDA_ENCABEZADO)
    doc.setLineWidth(0.8)
    doc.line(margen, y + 2, margen + 55, y + 2)
    doc.setLineWidth(0.2)
    y += 9

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(90, 90, 90)
    doc.text(`Año: ${anio}`, margen, y)
    y += 8

    dibujarEncabezadoTabla()
  }

  function dibujarEncabezadoTabla() {
    doc.setFillColor(...COLOR_BANDA_ENCABEZADO)
    doc.rect(margen, y - 4.5, anchoUtil, 7, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    let x = margen
    COLUMNAS.forEach((c) => {
      const tx = c.alinear === "right" ? x + c.ancho - 1.5 : x + 1.5
      doc.text(c.titulo, tx, y, { align: c.alinear === "right" ? "right" : "left" })
      x += c.ancho
    })
    y += 6.5
    doc.setTextColor(30, 30, 30)
    doc.setFont("helvetica", "normal")
  }

  function dibujarPiePagina() {
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.setTextColor(140, 140, 140)
    doc.text(`Página ${numeroPagina}`, 210 - margen - 15, altoHoja - 12)
    doc.setTextColor(30, 30, 30)
  }

  dibujarEncabezadoPagina()

  meses.forEach((m, idx) => {
    const alturaFila = ALTO_LINEA + 1
    const pct = m.programados > 0 ? Math.round((m.cumplidos / m.programados) * 100) : null

    if (y + alturaFila > altoHoja - 20) {
      dibujarPiePagina()
      doc.addPage()
      numeroPagina++
      y = 20
      dibujarEncabezadoPagina()
    }

    if (idx % 2 === 1) {
      doc.setFillColor(...COLOR_CEBRA)
      doc.rect(margen, y - 3.5, anchoUtil, alturaFila, "F")
    }

    const valores = [
      NOMBRES_MES[m.mes],
      String(m.programados),
      String(m.cumplidos),
      String(m.abortados),
      pct != null ? `${pct}%` : "—",
    ]

    doc.setFontSize(9)
    let x = margen
    valores.forEach((v, i) => {
      const c = COLUMNAS[i]
      const tx = c.alinear === "right" ? x + c.ancho - 1.5 : x + 1.5
      doc.text(v, tx, y, { align: c.alinear === "right" ? "right" : "left" })
      x += c.ancho
    })
    y += alturaFila + 1
  })

  dibujarPiePagina()

  const totalProgramados = meses.reduce((acc, m) => acc + m.programados, 0)
  doc.setFontSize(8.5)
  doc.setFont("helvetica", "italic")
  doc.text(`${totalProgramados} escalas programadas en el año`, margen, altoHoja - 12)

  const nombreArchivo = `progreso_anual_${anio}.pdf`
  doc.save(nombreArchivo)
}