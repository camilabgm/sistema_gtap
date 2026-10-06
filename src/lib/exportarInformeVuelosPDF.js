// src/lib/exportarInformeVuelosPDF.js
//
// Informe de Vuelos en el formato del Memo 40 del GTAP — una fila por
// vuelo cumplido, con las columnas que ya usa el Memo 40 más
// tripulación, combustible, pasajeros/carga y observación.
//
// CAMBIO (rama feat/pdf-manifiesto-memo40): reescrito sobre las piezas
// compartidas de pdf/basePDF.js (encabezado institucional, tabla con
// autoTable, "Página X de Y", márgenes de 15mm). Columnas nuevas:
//   - Mes y Día separados (en hora de Paraguay), el mes en mayúsculas
//     como en el Memo 40: ENE, FEB… SEPT, OCT…
//   - Avión: el modelo corto (primera palabra del tipo: "C-208B",
//     "BE-90", "C-680").
//   - Misión: celda en azul.
//   - T. vuelo en horas:minutos ("01:10").
//   - Destino: la ruta completa con las escalas intermedias
//     ("SGAS-PIRAJUI-SGAS"), no solo origen y destino final.
//   - Observación: la del Post-Vuelo; si hubo incidente o accidente,
//     va adelante.
// Al final, una fila de TOTALES alineada con las columnas: vuelos,
// horas de vuelo, combustible y pasajeros/carga — los acumulados del
// Memo 40 salen de filtrar el informe (por aeronave, solicitante o
// período) y leer esta fila.

import { fechaUTCAInputParaguay } from "@/lib/fechaHora"
import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import {
  nuevoDocumentoPDF,
  encabezadoPDF,
  tablaPDF,
  pieDePaginaPDF,
  nombreArchivoPDF,
} from "@/lib/basePDF"

const MESES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEPT", "OCT", "NOV", "DIC"]

const ETIQUETAS_NOVEDAD = {
  INCIDENTE: "INCIDENTE",
  ACCIDENTE: "ACCIDENTE",
}

// Azul de la celda de Misión — mismo tono que el Memo 40.
const COLOR_MISION = [91, 141, 214]

// A4 horizontal: 297mm - 2 × 15mm de margen = 267mm útiles.
const COLUMNAS = [
  { titulo: "Mes",          ancho: 11 },
  { titulo: "Día",          ancho: 9,  alinear: "center" },
  { titulo: "Avión",        ancho: 18 },
  { titulo: "Matrícula",    ancho: 19 },
  { titulo: "Solicitante",  ancho: 32 },
  { titulo: "Misión",       ancho: 15, alinear: "center" },
  { titulo: "T. vuelo",     ancho: 14, alinear: "center" },
  { titulo: "Destino",      ancho: 38 },
  { titulo: "Tripulación",  ancho: 46 },
  { titulo: "Comb.",        ancho: 15, alinear: "right" },
  { titulo: "Pax · Carga",  ancho: 18, alinear: "right" },
  { titulo: "Observación",  ancho: 32 },
]
const INDICE_MISION = 5

// "2026-09-26T14:40" (hora de Paraguay) → { mes: "SEPT", dia: "26" }
function mesYDia(iso) {
  const local = fechaUTCAInputParaguay(iso)
  if (!local) return { mes: "—", dia: "—" }
  return { mes: MESES[Number(local.slice(5, 7)) - 1], dia: String(Number(local.slice(8, 10))) }
}

// 70 → "01:10"
function horasMinutos(minutos) {
  if (minutos == null || isNaN(minutos)) return "—"
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// "C-208B Caravan" → "C-208B"
function modeloCorto(tipo) {
  if (!tipo) return "—"
  return String(tipo).trim().split(/\s+/)[0]
}

function textoDestino(f) {
  if (Array.isArray(f.puntos_ruta) && f.puntos_ruta.length > 0) return f.puntos_ruta.join("-")
  return f.ruta || "—"
}

function textoPaxCarga(pasajeros, cargaKg) {
  if (pasajeros == null && cargaKg == null) return "—"
  return `${pasajeros ?? 0} · ${redondear(cargaKg ?? 0)} kg`
}

function textoObservacion(f) {
  const partes = []
  if (f.novedad && ETIQUETAS_NOVEDAD[f.novedad]) {
    partes.push(`${ETIQUETAS_NOVEDAD[f.novedad]}${f.detalle_novedad ? `: ${f.detalle_novedad}` : ""}`)
  }
  if (f.observaciones) partes.push(f.observaciones)
  return partes.length > 0 ? partes.join(" — ") : "—"
}

// Hasta 2 decimales, sin ceros de más (480 → "480", 12.5 → "12.5")
function redondear(n) {
  return String(Math.round(Number(n) * 100) / 100)
}

export function exportarInformeVuelosPDF(filas, filtros) {
  const doc = nuevoDocumentoPDF({ orientacion: "landscape" })

  const descripcionFiltros = [
    `Período: ${formatearFechaSoloDia(filtros.desde)} al ${formatearFechaSoloDia(filtros.hasta)}`,
  ]
  if (filtros.aeronave) descripcionFiltros.push(`Aeronave: ${filtros.aeronave}`)
  if (filtros.tipoMision) descripcionFiltros.push(`Tipo de misión: ${filtros.tipoMision}`)
  if (filtros.solicitante) descripcionFiltros.push(`Solicitante: ${filtros.solicitante}`)

  const y = encabezadoPDF(doc, { titulo: "INFORME DE VUELOS", filtros: descripcionFiltros })

  // Totales para la última fila
  let totalMinutos = 0
  let totalCombustible = 0
  let totalPasajeros = 0
  let totalCarga = 0
  for (const f of filas) {
    totalMinutos += f.horas_vuelo_minutos ?? 0
    totalCombustible += f.combustible_litros ?? 0
    totalPasajeros += f.pasajeros ?? 0
    totalCarga += f.carga_kg ?? 0
  }

  // "TOTAL" ocupa las 4 primeras columnas (Mes, Día, Avión, Matrícula)
  // para no partirse en la columna angosta de Mes. Cada total queda
  // debajo de su columna y con su misma alineación.
  const filaTotales = [
    { content: "TOTAL", colSpan: 4 },
    `${filas.length} vuelo${filas.length === 1 ? "" : "s"}`,
    "",
    { content: horasMinutos(totalMinutos), styles: { halign: "center" } },
    "", "",
    { content: `${redondear(totalCombustible)} L`, styles: { halign: "right" } },
    { content: `${totalPasajeros} · ${redondear(totalCarga)} kg`, styles: { halign: "right" } },
    "",
  ]

  tablaPDF(doc, {
    startY: y,
    columnas: COLUMNAS,
    tamanoLetra: 7,
    filaTotales,
    filas: filas.map((f) => {
      const { mes, dia } = mesYDia(f.hora_despegue_estimada)
      return [
        mes,
        dia,
        modeloCorto(f.aeronave_tipo),
        f.aeronave_matricula,
        f.solicitante || "—",
        f.tipo_mision_codigo,
        horasMinutos(f.horas_vuelo_minutos),
        textoDestino(f),
        f.tripulacion || "—",
        f.combustible_litros != null ? `${redondear(f.combustible_litros)} L` : "—",
        textoPaxCarga(f.pasajeros, f.carga_kg),
        textoObservacion(f),
      ]
    }),
    // Celda de Misión en azul, solo en las filas de datos.
    personalizarCelda: (celda) => {
      if (celda.section === "body" && celda.column.index === INDICE_MISION) {
        celda.cell.styles.fillColor = COLOR_MISION
        celda.cell.styles.textColor = [255, 255, 255]
        celda.cell.styles.fontStyle = "bold"
      }
    },
  })

  pieDePaginaPDF(doc)

  doc.save(nombreArchivoPDF("informe-vuelos", filtros.desde, "a", filtros.hasta))
}