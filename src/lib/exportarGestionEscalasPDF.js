// src/lib/exportarGestionEscalasPDF.js
//
// Extraído de HistorialEscalas.js para seguir el mismo estándar que
// ya usa Informes: el dibujo del PDF vive en su propio archivo de
// lib/, nunca adentro de un componente. Recibe las filas ya
// filtradas/ordenadas — no vuelve a calcular nada, solo dibuja.

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { estadoDetallado, formatearFechaHoraCompacta } from "@/lib/escalas"
import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"

function textoTripulacion(tripulacion) {
  if (!tripulacion || tripulacion.length === 0) return "—"
  return tripulacion.map((t) => `${t.persona.grado} ${t.persona.apellido}`).join(", ")
}

function textoRuta(itinerarios) {
  const primero = itinerarios?.[0]
  const ultimo = itinerarios?.[itinerarios.length - 1]
  return primero && ultimo ? `${primero.origen} → ${ultimo.destino}` : "—"
}

export function exportarGestionEscalasPDF(filas) {
  const doc = new jsPDF({ orientation: "landscape" })
  doc.setFontSize(14)
  doc.text("Gestión de Escalas — Sistema GTAP", 14, 15)
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Generado: ${new Date().toLocaleString("es-PY")}`, 14, 21)

  autoTable(doc, {
    startY: 26,
    head: [["Solicitante", "Fecha del vuelo", "Aeronave", "Ruta", "Salida", "N. Orden", "Tripulación", "Tipo de misión", "Estado"]],
    body: filas.map((e) => [
      e.solicitante || "—",
      formatearFechaSoloDia(e.fecha),
      e.aeronave?.matricula || "—",
      textoRuta(e.itinerarios),
      formatearFechaHoraCompacta(e.hora_despegue_estimada),
      e.nro_orden || "—",
      textoTripulacion(e.tripulacion),
      e.tipo_mision ? `${e.tipo_mision.codigo} — ${e.tipo_mision.nombre}` : "—",
      estadoDetallado(e).texto,
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  })

  doc.save(`gestion-escalas-${new Date().toISOString().slice(0, 10)}.pdf`)
}