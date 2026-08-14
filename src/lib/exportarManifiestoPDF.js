// src/lib/exportarManifiestoPDF.js
//
// Genera el PDF del manifiesto con jsPDF, calcado del formulario en
// papel que usa el GTAP hoy. Corre en el cliente (usa jsPDF con
// doc.save(), que dispara la descarga directo en el navegador).

import { jsPDF } from "jspdf"
import { construirCadenaRuta } from "@/lib/manifiesto"

function formatearHora(iso) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("es-PY", {
    timeZone: "America/Asuncion",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso))
}

export function exportarManifiestoPDF(detalle) {
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const margen = 15
  let y = 20

  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("MANIFIESTO DE VUELO", margen, y)
  y += 10

  doc.setFontSize(10)
  const escribirCampo = (etiqueta, valor, x, yPos) => {
    doc.setFont("helvetica", "bold")
    doc.text(`${etiqueta}:`, x, yPos)
    doc.setFont("helvetica", "normal")
    doc.text(`${valor ?? "—"}`, x + 28, yPos)
  }

  escribirCampo("Aeronave", detalle.aeronave?.tipo, margen, y)
  escribirCampo("Matrícula", detalle.aeronave?.matricula, margen + 90, y)
  y += 8

  escribirCampo("Destino/s", construirCadenaRuta(detalle.itinerarios), margen, y)
  y += 8

  if (detalle.estado === "CUMPLIDA") {
    escribirCampo("Hs de vuelo", detalle.horas_vuelo, margen, y)
    escribirCampo("Comb. utilizado", detalle.combustible_consumido ? `${detalle.combustible_consumido} L ${detalle.tipo_combustible ?? ""}` : "—", margen + 90, y)
    y += 6
    escribirCampo("Hs en tierra", detalle.horas_tierra, margen, y)
    y += 8
  } else {
    escribirCampo("Hora estimada", `${formatearHora(detalle.hora_salida)} → ${formatearHora(detalle.hora_llegada)}`, margen, y)
    y += 8
  }

  doc.setDrawColor(0)
  doc.line(margen, y, 210 - margen, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.text("TRIPULANTES", margen, y)
  y += 6
  doc.setFont("helvetica", "normal")
  if (detalle.tripulacion.length === 0) {
    doc.text("Sin tripulación asignada", margen, y)
    y += 6
  } else {
    detalle.tripulacion.forEach((t, i) => {
      doc.text(`${i + 1}- ${t.persona.grado} ${t.persona.nombre} ${t.persona.apellido}`, margen, y)
      y += 6
    })
  }

  y += 2
  doc.line(margen, y, 210 - margen, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.text("PASAJERO(S) Y/O CARGA(S)", margen, y)
  y += 6
  doc.setFont("helvetica", "normal")

  if (detalle.pasajeros.length === 0 && detalle.cargas.length === 0) {
    doc.text("Sin pasajeros ni carga registrada", margen, y)
    y += 6
  } else {
    detalle.pasajeros.forEach((p) => {
      doc.text(`• ${p.nombre} ${p.apellido} — Doc. ${p.nro_documento} — ${p.nacionalidad}`, margen, y)
      y += 6
    })
    detalle.cargas.forEach((c) => {
      const desc = c.descripcion ? ` — ${c.descripcion}` : ""
      const peso = c.peso ? ` — ${c.peso} kg` : ""
      doc.text(`• ${c.tipo}${desc}${peso}`, margen, y)
      y += 6
    })
  }

  y += 2
  doc.line(margen, y, 210 - margen, y)
  y += 6

  doc.setFont("helvetica", "bold")
  doc.text("OBSERVACIONES", margen, y)
  y += 6
  doc.setFont("helvetica", "normal")
  const observaciones = doc.splitTextToSize(detalle.observaciones || "Sin observaciones", 210 - margen * 2)
  doc.text(observaciones, margen, y)

  const nombreArchivo = `manifiesto_escala_${detalle.id}.pdf`
  doc.save(nombreArchivo)
}