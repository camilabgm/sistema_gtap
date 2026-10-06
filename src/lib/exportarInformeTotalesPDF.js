// src/lib/exportarInformeTotalesPDF.js
//
// Exporta exactamente lo que está en pantalla: la pestaña activa (Por
// tripulante / Por aeronave / Por tipo de misión / Por institución
// solicitante) con el filtro específico aplicado en ese momento — no
// las 4 pestañas juntas.
//
// CAMBIO (rama fix/pdf-base-comun): usa las piezas compartidas de
// pdf/basePDF.js (encabezado institucional, tabla con autoTable,
// "Página X de Y", márgenes de 15mm). Antes la tabla, los saltos de
// página y las filas cebra se dibujaban a mano en este archivo. El
// período se muestra como dd/mm/aaaa en vez de aaaa-mm-dd. Mismo
// contenido y mismas columnas que antes.

import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import {
  nuevoDocumentoPDF,
  encabezadoPDF,
  tablaPDF,
  textoFinalPDF,
  pieDePaginaPDF,
  nombreArchivoPDF,
} from "@/lib/basePDF"

const TITULOS = {
  por_tripulante: "INFORME DE TOTALES — POR TRIPULANTE",
  por_aeronave: "INFORME DE TOTALES — POR AERONAVE",
  por_tipo_mision: "INFORME DE TOTALES — COMBUSTIBLE POR TIPO DE MISIÓN",
  por_solicitante: "INFORME DE TOTALES — POR INSTITUCIÓN SOLICITANTE",
}

// A4 vertical: 210mm - 2 × 15mm de margen = 180mm útiles.
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
  por_solicitante: [
    { titulo: "Institución solicitante", ancho: 110, campo: "nombre" },
    { titulo: "Vuelos", ancho: 30, campo: "vuelos", alinear: "right" },
    { titulo: "Horas de vuelo", ancho: 40, campo: "horas_texto", alinear: "right" },
  ],
}

export function exportarInformeTotalesPDF(filas, { pestana, desde, hasta, filtroTexto }) {
  const columnas = COLUMNAS_POR_PESTANA[pestana]
  const doc = nuevoDocumentoPDF({ orientacion: "portrait" })

  const filtros = [`Período: ${formatearFechaSoloDia(desde)} al ${formatearFechaSoloDia(hasta)}`]
  if (filtroTexto) filtros.push(filtroTexto)

  const y = encabezadoPDF(doc, { titulo: TITULOS[pestana], filtros })

  const yFinal = tablaPDF(doc, {
    startY: y,
    columnas,
    tamanoLetra: 9,
    filas: filas.map((f) =>
      columnas.map((c) => `${f[c.campo] ?? "—"}${f[c.campo] != null ? c.sufijo || "" : ""}`)
    ),
  })

  textoFinalPDF(doc, yFinal, `${filas.length} fila${filas.length === 1 ? "" : "s"} en total`)
  pieDePaginaPDF(doc)

  doc.save(nombreArchivoPDF("informe-totales", pestana, desde, "a", hasta))
}