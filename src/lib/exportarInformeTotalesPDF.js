// Destino: src/lib/exportarInformeTotalesPDF.js
//
// Mismo criterio visual que exportarInformeVuelosPDF.js — banda de
// color en encabezados, filas cebra, numeración de página. Exporta
// exactamente lo que está en pantalla: la pestaña activa (Por
// tripulante / Por aeronave / Combustible por tipo de misión) con el
// filtro específico que esté aplicado en ese momento — no las 3
// pestañas juntas — así el PDF siempre coincide con lo que la persona
// está mirando cuando aprieta el botón.

import { jsPDF } from "jspdf"

const TITULOS = {
  por_tripulante: "INFORME DE TOTALES — POR TRIPULANTE",
  por_aeronave: "INFORME DE TOTALES — POR AERONAVE",
  por_tipo_mision: "INFORME DE TOTALES — COMBUSTIBLE POR TIPO DE MISIÓN",
}

const COLUMNAS_POR_PESTANA = {
  por_tripulante: [
    { titulo: "Tripulante", ancho: 110, campo: "nombre" },
    { titulo: "Vuelos", ancho: 30, campo: "vuelos", alinear: "right" },
    { titulo: "Horas de vuelo", ancho: 40, campo: "horas_texto", alinear: "right" },
  ],
  por_aeronave: [
    { titulo: "Aeronave", ancho: 110, campo: "matricula" },
    { titulo: "Vuelos", ancho: 30, campo: "vuelos", alinear: "right" },
    { titulo: "Horas de vuelo", ancho: 40, campo: "horas_texto", alinear: "right" },
  ],
  por_tipo_mision: [
    { titulo: "Tipo de misión", ancho: 110, campo: "nombre" },
    { titulo: "Vuelos", ancho: 30, campo: "vuelos", alinear: "right" },
    { titulo: "Combustible", ancho: 40, campo: "litros", alinear: "right", sufijo: " L" },
  ],
}

const ALTO_LINEA = 4.5
const COLOR_BANDA_ENCABEZADO = [30, 58, 95]
const COLOR_CEBRA = [245, 246, 248]

export function exportarInformeTotalesPDF(filas, { pestana, desde, hasta, filtroTexto }) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  const margen = 15
  const anchoUtil = 210 - margen * 2
  const altoHoja = 297
  let y = 20
  let numeroPagina = 1

  const columnas = COLUMNAS_POR_PESTANA[pestana]

  function dibujarEncabezadoPagina() {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.setTextColor(20, 20, 20)
    doc.text(TITULOS[pestana], margen, y)

    doc.setDrawColor(...COLOR_BANDA_ENCABEZADO)
    doc.setLineWidth(0.8)
    doc.line(margen, y + 2, margen + 55, y + 2)
    doc.setLineWidth(0.2)
    y += 9

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(90, 90, 90)
    const partes = [`Período: ${desde} al ${hasta}`]
    if (filtroTexto) partes.push(filtroTexto)
    doc.text(partes.join("   ·   "), margen, y)
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
    columnas.forEach((c) => {
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

  filas.forEach((f, idx) => {
    const alturaFila = ALTO_LINEA + 1

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

    doc.setFontSize(9)
    let x = margen
    columnas.forEach((c) => {
      const valor = `${f[c.campo]}${c.sufijo || ""}`
      const tx = c.alinear === "right" ? x + c.ancho - 1.5 : x + 1.5
      doc.text(valor, tx, y, { align: c.alinear === "right" ? "right" : "left" })
      x += c.ancho
    })
    y += alturaFila + 1
  })

  dibujarPiePagina()

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "italic")
  doc.text(`${filas.length} fila${filas.length === 1 ? "" : "s"} en total`, margen, altoHoja - 12)

  const nombreArchivo = `informe_totales_${pestana}_${desde}_a_${hasta}.pdf`
  doc.save(nombreArchivo)
}