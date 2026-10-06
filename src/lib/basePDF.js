// src/lib/basePDF.js
//
// Piezas compartidas por TODOS los exportadores de PDF del sistema.
// Antes cada exportador tenía su propia copia de colores, encabezado,
// pie y márgenes (12, 14 o 15mm según el archivo), y Gestión de
// Escalas además usaba otro color y otra técnica. Acá vive una sola
// versión de cada cosa, así todos los PDFs se ven de la misma familia
// y un cambio de estilo se hace en un único lugar.
//
// Uso típico desde un exportador:
//
//   const doc = nuevoDocumentoPDF({ orientacion: "landscape" })
//   let y = encabezadoPDF(doc, { titulo: "GESTIÓN DE ESCALAS", filtros })
//   y = tablaPDF(doc, { startY: y, columnas, filas })
//   textoFinalPDF(doc, y, "15 escalas")
//   pieDePaginaPDF(doc)          // SIEMPRE al final, numera todas las hojas
//   doc.save(nombreArchivoPDF("gestion-escalas"))
//
// Las tablas usan autoTable: ajusta el texto largo en varias líneas,
// corta las páginas solo y repite el encabezado de la tabla en cada
// hoja — antes eso se programaba a mano en cada exportador.
//
// CAMBIO (rama feat/pdf-manifiesto-memo40) — tablaPDF suma tres
// opciones, todas opcionales (los exportadores que no las usan quedan
// igual que antes):
//   - variante: "informe" (azul marino + cebra, la de siempre) o
//     "formulario" (grilla con bordes finos y encabezado gris claro,
//     como un formulario en papel — la usa la Declaración General).
//   - filaTotales: una última fila destacada, alineada con las
//     columnas, que se imprime al final de la tabla.
//   - personalizarCelda(celda): para pintar celdas puntuales (ej. la
//     columna Misión en azul del Informe de Vuelos).
// Y nombreArchivoPDF limpia caracteres que no van en un nombre de
// archivo (ej. "GTAP/0001" → "GTAP-0001").

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { formatearFechaHora } from "@/lib/fechaHora"
import { hoyEnParaguay } from "@/lib/fechaSoloDia"

export const MARGEN = 15 // mm, igual en todos los PDFs y en los 4 bordes

export const COLORES = {
  banda:     [30, 58, 95],   // azul marino institucional (encabezado de tabla, acentos)
  cebra:     [245, 246, 248],
  texto:     [30, 30, 30],
  secundario:[90, 90, 90],
  tenue:     [140, 140, 140],
}

const LINEAS_INSTITUCIONALES = [
  "FUERZA AÉREA PARAGUAYA",
  "I BRIGADA AÉREA",
  "GRUPO DE TRANSPORTE AÉREO PRESIDENCIAL",
]

// ── Texto seguro ────────────────────────────────────────────────────
//
// Las fuentes estándar de jsPDF (Helvetica) solo conocen los caracteres
// de la codificación WinAnsi: el alfabeto latino con tildes y ñ, más un
// puñado de signos (— – • … “ ” ‘ ’ € ™). Si un texto trae un carácter
// fuera de esa lista (ej. "→"), jsPDF cambia TODA la cadena a un modo
// de dos bytes y el resultado sale con las letras separadas ("S G A S").
// Esta función reemplaza los conocidos por un equivalente seguro y
// descarta cualquier otro que no exista en la fuente.

const EXTRAS_WINANSI = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ"

const REEMPLAZOS = [
  [/[→⇒➔⟶]/g, "-"],
  [/[←⇐⟵]/g, "-"],
  [/[✓✔]/g, ""],
  [/[✗✘✕]/g, ""],
  [/⚠/g, "!"],
  [/[\u00A0\u202F\u2009\u2007]/g, " "], // espacios "raros" (sin corte, angosto, fino)
]

export function limpiarTextoPDF(valor) {
  if (valor === null || valor === undefined) return ""
  let texto = String(valor)
  for (const [patron, reemplazo] of REEMPLAZOS) {
    texto = texto.replace(patron, reemplazo)
  }
  // Array.from recorre por carácter real (un emoji cuenta como uno).
  texto = Array.from(texto)
    .filter((c) => c.codePointAt(0) <= 0xff || EXTRAS_WINANSI.includes(c))
    .join("")
  return texto.replace(/ {2,}/g, " ").trim()
}

// ── Documento ───────────────────────────────────────────────────────

export function nuevoDocumentoPDF({ orientacion = "portrait" } = {}) {
  return new jsPDF({ unit: "mm", format: "a4", orientation: orientacion })
}

// ── Encabezado (solo en la primera hoja) ────────────────────────────
//
// Arriba a la izquierda las 3 líneas institucionales, arriba a la
// derecha "Generado: ..." en hora de Paraguay. Después el título con
// su barra de acento y, si hay, la línea de filtros aplicados (se
// parte en varios renglones si es larga). Devuelve la "y" donde puede
// empezar la tabla.

export function encabezadoPDF(doc, { titulo, filtros = [] }) {
  const anchoHoja = doc.internal.pageSize.getWidth()
  const anchoUtil = anchoHoja - MARGEN * 2
  let y = MARGEN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(...COLORES.secundario)
  LINEAS_INSTITUCIONALES.forEach((linea) => {
    doc.text(limpiarTextoPDF(linea), MARGEN, y)
    y += 3.8
  })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(...COLORES.tenue)
  const generado = `Generado: ${formatearFechaHora(new Date(), { second: undefined })}`
  doc.text(limpiarTextoPDF(generado), anchoHoja - MARGEN, MARGEN, { align: "right" })

  // Línea fina separando lo institucional del contenido
  y += 1.5
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.2)
  doc.line(MARGEN, y, anchoHoja - MARGEN, y)
  y += 8

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.setTextColor(...COLORES.texto)
  doc.text(limpiarTextoPDF(titulo), MARGEN, y)

  doc.setDrawColor(...COLORES.banda)
  doc.setLineWidth(0.8)
  doc.line(MARGEN, y + 2, MARGEN + 55, y + 2)
  doc.setLineWidth(0.2)
  y += 8

  const filtrosLimpios = filtros.map(limpiarTextoPDF).filter(Boolean)
  if (filtrosLimpios.length > 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(...COLORES.secundario)
    const lineas = doc.splitTextToSize(filtrosLimpios.join("   ·   "), anchoUtil)
    doc.text(lineas, MARGEN, y)
    y += lineas.length * 4.2 + 2
  }

  doc.setTextColor(...COLORES.texto)
  return y + 1
}

// ── Tabla ───────────────────────────────────────────────────────────
//
// columnas:    [{ titulo, ancho (mm, opcional), alinear: "left"|"right"|"center" }]
// filas:       arrays de valores, en el mismo orden que las columnas
// variante:    "informe" (por defecto) | "formulario"
// filaTotales: opcional, una fila extra al final. Cada valor puede ser
//              texto o una celda de autoTable ({ content, colSpan,
//              styles }) — ej. "TOTAL" ocupando varias columnas.
// personalizarCelda: opcional, (celda) => { ... } — recibe la celda de
//              autoTable (celda.section, celda.column.index,
//              celda.row.index, celda.cell.styles) y puede cambiarle
//              el estilo antes de dibujarla.
// Devuelve la "y" donde terminó la tabla.

// Limpia el texto de una celda que puede venir como texto simple o
// como objeto de autoTable ({ content, colSpan, styles }).
function limpiarCeldaPDF(valor) {
  if (valor !== null && typeof valor === "object" && "content" in valor) {
    return { ...valor, content: limpiarTextoPDF(valor.content) }
  }
  return limpiarTextoPDF(valor)
}

const ESTILOS_VARIANTE = {
  informe: {
    styles: { lineWidth: 0 },
    headStyles: { fillColor: COLORES.banda, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: COLORES.cebra },
  },
  formulario: {
    styles: { lineWidth: 0.2, lineColor: [120, 120, 120] },
    headStyles: { fillColor: [235, 235, 235], textColor: COLORES.texto },
    alternateRowStyles: {},
  },
}

export function tablaPDF(doc, {
  startY,
  columnas,
  filas,
  tamanoLetra = 8.5,
  variante = "informe",
  filaTotales = null,
  personalizarCelda = null,
}) {
  const estilo = ESTILOS_VARIANTE[variante] || ESTILOS_VARIANTE.informe

  const columnStyles = {}
  columnas.forEach((c, i) => {
    columnStyles[i] = {
      ...(c.ancho ? { cellWidth: c.ancho } : {}),
      halign: c.alinear || "left",
    }
  })

  autoTable(doc, {
    startY,
    head: [columnas.map((c) => limpiarTextoPDF(c.titulo))],
    body: filas.map((fila) => fila.map((valor) => limpiarTextoPDF(valor))),
    foot: filaTotales ? [filaTotales.map(limpiarCeldaPDF)] : undefined,
    showFoot: filaTotales ? "lastPage" : "never",
    margin: { left: MARGEN, right: MARGEN, top: MARGEN, bottom: MARGEN + 6 },
    styles: {
      font: "helvetica",
      fontSize: tamanoLetra,
      cellPadding: 2,
      textColor: COLORES.texto,
      valign: "top",
      ...estilo.styles,
    },
    headStyles: {
      fontStyle: "bold",
      valign: "middle",
      ...estilo.headStyles,
    },
    footStyles: {
      fillColor: [225, 230, 238],
      textColor: COLORES.texto,
      fontStyle: "bold",
    },
    alternateRowStyles: estilo.alternateRowStyles,
    columnStyles,
    didParseCell: personalizarCelda || undefined,
  })

  return doc.lastAutoTable.finalY
}

// ── Texto de cierre debajo de la tabla (ej. "15 escalas") ───────────

export function textoFinalPDF(doc, y, texto) {
  const altoHoja = doc.internal.pageSize.getHeight()
  let yTexto = y + 6
  if (yTexto > altoHoja - MARGEN - 6) {
    doc.addPage()
    yTexto = MARGEN + 4
  }
  doc.setFont("helvetica", "italic")
  doc.setFontSize(8.5)
  doc.setTextColor(...COLORES.secundario)
  doc.text(limpiarTextoPDF(texto), MARGEN, yTexto)
  doc.setTextColor(...COLORES.texto)
}

// ── Pie de página — llamar SIEMPRE al final ─────────────────────────
//
// Recorre todas las hojas ya armadas y escribe "Sistema GTAP" a la
// izquierda y "Página X de Y" a la derecha. Tiene que ir al final
// porque recién ahí se sabe cuántas hojas hay en total.

export function pieDePaginaPDF(doc) {
  const total = doc.getNumberOfPages()
  const anchoHoja = doc.internal.pageSize.getWidth()
  const altoHoja = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.5)
    doc.setTextColor(...COLORES.tenue)
    doc.text("Sistema GTAP", MARGEN, altoHoja - MARGEN + 6)
    doc.text(`Página ${i} de ${total}`, anchoHoja - MARGEN, altoHoja - MARGEN + 6, { align: "right" })
  }
  doc.setTextColor(...COLORES.texto)
}

// ── Nombre de archivo ───────────────────────────────────────────────
//
// Une las partes con "_" y, si no se pasa una fecha propia, agrega la
// fecha de HOY en Paraguay (no la de UTC, que después de las 21:00 ya
// sería mañana).

export function nombreArchivoPDF(...partes) {
  const limpias = partes
    .filter(Boolean)
    .map((p) =>
      String(p)
        .trim()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // sin tildes
        .replace(/[^A-Za-z0-9.-]+/g, "-")                 // "/", "'", espacios → "-"
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean)
  return `${limpias.join("_")}.pdf`
}

export function fechaHoyParaguayISO() {
  return hoyEnParaguay().toISOString().slice(0, 10)
}