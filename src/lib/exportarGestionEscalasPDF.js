// src/lib/exportarGestionEscalasPDF.js
//
// El dibujo del PDF vive en lib/, nunca adentro de un componente.
// Recibe las filas ya filtradas/ordenadas — no vuelve a calcular nada,
// solo dibuja.
//
// CAMBIO (rama fix/pdf-base-comun):
//   - Usa las piezas compartidas de pdf/basePDF.js: encabezado
//     institucional, tabla con el mismo estilo que los Informes (azul
//     marino, filas cebra), "Página X de Y" y márgenes de 15mm.
//   - La ruta ya no usa la flecha "→" (la fuente del PDF no la tiene y
//     dejaba el texto con las letras separadas: "S G A S"). Además,
//     limpiarTextoPDF protege todas las celdas.
//   - "Tipo de misión" muestra solo el código (OPR), como el Memo 40.
//   - Anchos de columna fijos: "Solicitante" ya no ocupa media hoja.
//   - Nuevo parámetro "filtros": la lista de filtros aplicados en
//     pantalla, que se imprime debajo del título.
//   - "Generado" y el nombre del archivo, con fecha y hora de Paraguay.

import { estadoDetallado, formatearFechaHoraCompacta } from "@/lib/escalas"
import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import {
  nuevoDocumentoPDF,
  encabezadoPDF,
  tablaPDF,
  textoFinalPDF,
  pieDePaginaPDF,
  nombreArchivoPDF,
  fechaHoyParaguayISO,
} from "@/lib/basePDF"

function textoTripulacion(tripulacion) {
  if (!tripulacion || tripulacion.length === 0) return "—"
  return tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
}

function textoRuta(itinerarios) {
  const primero = itinerarios?.[0]
  const ultimo = itinerarios?.[itinerarios.length - 1]
  return primero && ultimo ? `${primero.origen} - ${ultimo.destino}` : "—"
}

// A4 horizontal: 297mm - 2 × 15mm de margen = 267mm útiles.
const COLUMNAS = [
  { titulo: "Solicitante",     ancho: 38 },
  { titulo: "Fecha del vuelo", ancho: 22 },
  { titulo: "Aeronave",        ancho: 22 },
  { titulo: "Ruta",            ancho: 38 },
  { titulo: "Salida",          ancho: 24 },
  { titulo: "N. Orden",        ancho: 28 },
  { titulo: "Tripulación",     ancho: 50 },
  { titulo: "Misión",          ancho: 17 },
  { titulo: "Estado",          ancho: 28 },
]

export function exportarGestionEscalasPDF(filas, filtros = []) {
  const doc = nuevoDocumentoPDF({ orientacion: "landscape" })

  const y = encabezadoPDF(doc, {
    titulo: "GESTIÓN DE ESCALAS",
    filtros: filtros.length > 0 ? filtros : ["Sin filtros: todas las escalas del sistema"],
  })

  const yFinal = tablaPDF(doc, {
    startY: y,
    columnas: COLUMNAS,
    filas: filas.map((e) => [
      e.solicitante || "—",
      formatearFechaSoloDia(e.fecha),
      e.aeronave?.matricula || "—",
      textoRuta(e.itinerarios),
      formatearFechaHoraCompacta(e.hora_despegue_estimada),
      e.nro_orden || "—",
      textoTripulacion(e.tripulacion),
      e.tipo_mision?.codigo || "—",
      estadoDetallado(e).texto,
    ]),
  })

  textoFinalPDF(doc, yFinal, `${filas.length} escala${filas.length === 1 ? "" : "s"}`)
  pieDePaginaPDF(doc)

  doc.save(nombreArchivoPDF("gestion-escalas", fechaHoyParaguayISO()))
}