// Destino: src/lib/exportarInformeVuelosPDF.js
//
// v2 — arregla el bug real: la flecha "→" no existe en la fuente base
// de jsPDF (Helvetica estándar de PDF, sin Unicode completo) y salía
// mal codificada, rompiendo el cálculo de ancho de toda la fila. Se
// reemplaza por un guión simple, que sí soporta.
//
// De paso, mejora visual: encabezado con banda de color, filas cebra
// para que se siga mejor la lectura, numeración de página, y las
// filas con texto largo (Tripulación con varios nombres) ahora se
// muestran completas en varias líneas en vez de cortarse a la primera.

import { jsPDF } from "jspdf"

function formatearFechaHora(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

// "→" no existe en la fuente base de PDF — un guión simple sí, y se
// entiende igual de bien en un informe impreso.
function rutaSegura(ruta) {
  return String(ruta).replace(/→/g, "-")
}

const COLUMNAS = [
  { titulo: "Fecha/Hora", ancho: 30 },
  { titulo: "Aeronave · Ruta", ancho: 46 },
  { titulo: "Misión · Solicitante", ancho: 46 },
  { titulo: "Tripulación", ancho: 62 },
  { titulo: "Horas", ancho: 18 },
  { titulo: "Comb.", ancho: 18 },
  { titulo: "Pax · Carga", ancho: 22 },
]

const ALTO_LINEA = 4.5 // mm por línea de texto, a fontSize 8
const COLOR_BANDA_ENCABEZADO = [30, 58, 95] // azul oscuro institucional
const COLOR_CEBRA = [245, 246, 248]

export function exportarInformeVuelosPDF(filas, filtros) {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" })
  const margen = 12
  const anchoUtil = 297 - margen * 2
  const altoHoja = 210
  let y = 18
  let numeroPagina = 1

  function dibujarEncabezadoPagina() {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(15)
    doc.setTextColor(20, 20, 20)
    doc.text("INFORME DE VUELOS", margen, y)

    // Barra de acento debajo del título — simple, pero le da algo de
    // identidad visual en vez de ser solo texto plano arriba de todo.
    doc.setDrawColor(...COLOR_BANDA_ENCABEZADO)
    doc.setLineWidth(0.8)
    doc.line(margen, y + 2, margen + 55, y + 2)
    doc.setLineWidth(0.2)
    y += 9

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(90, 90, 90)
    const partesFiltro = [`Período: ${filtros.desde} al ${filtros.hasta}`]
    if (filtros.aeronave) partesFiltro.push(`Aeronave: ${filtros.aeronave}`)
    if (filtros.tipoMision) partesFiltro.push(`Tipo de misión: ${filtros.tipoMision}`)
    if (filtros.solicitante) partesFiltro.push(`Solicitante: ${filtros.solicitante}`)
    doc.text(partesFiltro.join("   ·   "), margen, y)
    y += 8

    dibujarEncabezadoTabla()
  }

  function dibujarEncabezadoTabla() {
    // Banda de color detrás de los títulos de columna, en vez de una
    // línea sola — se distingue mucho mejor dónde empieza la tabla.
    doc.setFillColor(...COLOR_BANDA_ENCABEZADO)
    doc.rect(margen, y - 4.5, anchoUtil, 7, "F")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    let x = margen
    COLUMNAS.forEach((c) => {
      doc.text(c.titulo, x + 1.5, y)
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
    doc.text(`Página ${numeroPagina}`, 297 - margen - 15, altoHoja - 8)
    doc.setTextColor(30, 30, 30)
  }

  dibujarEncabezadoPagina()

  filas.forEach((f, idx) => {
    const valores = [
      formatearFechaHora(f.hora_despegue_estimada),
      `${f.aeronave_matricula} · ${rutaSegura(f.ruta)}`,
      `${f.tipo_mision_codigo} · ${f.solicitante}`,
      f.tripulacion || "—",
      f.horas_vuelo_texto,
      f.combustible_litros != null ? `${f.combustible_litros} L` : "—",
      f.pasajeros != null || f.carga_kg != null
        ? `${f.pasajeros ?? 0} · ${f.carga_kg ?? 0}kg`
        : "—",
    ]

    // Cada columna puede necesitar más de una línea (ej. Tripulación
    // con 3 nombres) — la fila entera crece según la columna que más
    // líneas necesite, así ninguna columna se corta ni pierde datos.
    const lineasPorColumna = valores.map((v, i) =>
      doc.splitTextToSize(String(v), COLUMNAS[i].ancho - 3)
    )
    const maxLineas = Math.max(...lineasPorColumna.map((l) => l.length))
    const alturaFila = Math.max(maxLineas * ALTO_LINEA, ALTO_LINEA)

    if (y + alturaFila > altoHoja - 15) {
      dibujarPiePagina()
      doc.addPage()
      numeroPagina++
      y = 18
      dibujarEncabezadoPagina()
    }

    // Fila cebra — alterna un fondo gris clarito cada dos filas, para
    // que el ojo no se pierda siguiendo una fila larga.
    if (idx % 2 === 1) {
      doc.setFillColor(...COLOR_CEBRA)
      doc.rect(margen, y - 3.5, anchoUtil, alturaFila, "F")
    }

    doc.setFontSize(8)
    let x = margen
    lineasPorColumna.forEach((lineas, i) => {
      doc.text(lineas, x + 1.5, y)
      x += COLUMNAS[i].ancho
    })
    y += alturaFila + 1.5
  })

  dibujarPiePagina()

  doc.setFontSize(8.5)
  doc.setFont("helvetica", "italic")
  doc.text(`${filas.length} vuelos en total`, margen, altoHoja - 8)

  const nombreArchivo = `informe_vuelos_${filtros.desde}_a_${filtros.hasta}.pdf`
  doc.save(nombreArchivo)
}