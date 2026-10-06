// src/lib/exportarManifiestoPDF.js
//
// PDF del manifiesto como DECLARACIÓN GENERAL (Salida/Entrada) — el
// formulario en papel que usa el GTAP, al pie de la letra: mismos
// títulos, mismas secciones, mismas columnas y el mismo texto de
// "DECLARO". Una declaración por misión. Corre en el cliente (jsPDF con
// doc.save(), que dispara la descarga en el navegador).
//
// CAMBIO (rama feat/pdf-manifiesto-memo40): reescrito por completo.
// Antes era un "Manifiesto de vuelo" propio del sistema (con horas y
// combustible); ahora replica la Declaración General. Usa las piezas
// compartidas de pdf/basePDF.js (texto seguro, tablas, pie de página),
// con dos diferencias a propósito respecto de los demás PDFs:
//   - El encabezado institucional va CENTRADO, como en el formulario.
//   - Las tablas usan la variante "formulario" (grilla con bordes finos
//     y encabezado gris), no la azul de los informes: es un documento
//     oficial que tiene que verse como el papel que ya conocen.
//
// Datos (todos vienen de GET /api/manifiesto/<id>, sin cambios ahí):
//   AERONAVE → aeronave.tipo        MATRÍCULA → aeronave.matricula
//   DESTINO  → ruta completa        MISIÓN    → tipo_mision.codigo
//   APOYO A  → solicitante          FECHA     → fecha de la escala
//   FUNCIÓN  → rol en el vuelo      NATURALEZA DE LA MERCADERÍA → descripción
// Las columnas que el sistema no registra (observación del pasajero;
// cantidad y observación de la carga) quedan vacías, como en el papel.

import { formatearFechaSoloDia } from "@/lib/fechaSoloDia"
import {
  MARGEN,
  COLORES,
  limpiarTextoPDF,
  nuevoDocumentoPDF,
  tablaPDF,
  pieDePaginaPDF,
  nombreArchivoPDF,
} from "@/lib/basePDF"

const LINEAS_INSTITUCIONALES = [
  "FUERZA AÉREA PARAGUAYA",
  "I BRIGADA AÉREA",
  "GRUPO DE TRANSPORTE AÉREO PRESIDENCIAL",
]

const TEXTO_DECLARO =
  "QUE TODO LO MANIFESTADO EN ESTA DECLARACIÓN GENERAL Y EN CUALQUIER LISTA QUE ACOMPAÑE " +
  "REFERENTE A LA AERONAVE MENCIONADA ES EXACTO Y VERDADERO SEGÚN MI LEAL SABER Y ENTENDER."

const FUNCIONES = {
  PILOTO: "Piloto",
  COPILOTO: "Copiloto",
  TECNICO_DE_VUELO: "Técnico de vuelo",
}

// A4 vertical: 210mm - 2 × 15mm = 180mm útiles.
const COLUMNAS_TRIPULACION = [
  { titulo: "GRADO", ancho: 35 },
  { titulo: "NOMBRE Y APELLIDO", ancho: 95 },
  { titulo: "FUNCIÓN", ancho: 50 },
]
const COLUMNAS_PASAJEROS = [
  { titulo: "NOMBRE Y APELLIDO", ancho: 75 },
  { titulo: "NAC.", ancho: 25 },
  { titulo: "DOC. N°", ancho: 35 },
  { titulo: "OBSERVACIÓN", ancho: 45 },
]
const COLUMNAS_CARGA = [
  { titulo: "TIPO", ancho: 30 },
  { titulo: "CANTIDAD", ancho: 22, alinear: "center" },
  { titulo: "NATURALEZA DE LA MERCADERÍA", ancho: 68 },
  { titulo: "PESO BRUTO", ancho: 25, alinear: "right" },
  { titulo: "OBSERVACIÓN", ancho: 35 },
]

function textoDestino(itinerarios) {
  if (!itinerarios || itinerarios.length === 0) return "—"
  return [itinerarios[0].origen, ...itinerarios.map((t) => t.destino)].join(" - ")
}

// Si lo que sigue no entra en la hoja actual, pasa a una hoja nueva.
function asegurarEspacio(doc, y, alto) {
  const altoHoja = doc.internal.pageSize.getHeight()
  if (y + alto > altoHoja - MARGEN - 6) {
    doc.addPage()
    return MARGEN
  }
  return y
}

function tituloSeccion(doc, y, texto) {
  y = asegurarEspacio(doc, y, 14)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...COLORES.texto)
  doc.text(limpiarTextoPDF(texto), MARGEN, y)
  return y + 2
}

// Dibuja "ETIQUETA: valor" dentro de un ancho fijo. Si el valor es
// largo (ej. un destino con varias escalas), se parte en renglones.
// Devuelve cuántos mm de alto ocupó.
function campo(doc, etiqueta, valor, x, y, ancho) {
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  const textoEtiqueta = `${etiqueta}: `
  const anchoEtiqueta = doc.getTextWidth(textoEtiqueta)
  doc.text(textoEtiqueta, x, y)

  doc.setFont("helvetica", "normal")
  const lineas = doc.splitTextToSize(limpiarTextoPDF(valor || "—"), ancho - anchoEtiqueta - 2)
  doc.text(lineas, x + anchoEtiqueta, y)
  return lineas.length * 4
}

export function exportarManifiestoPDF(detalle) {
  const doc = nuevoDocumentoPDF({ orientacion: "portrait" })
  const anchoHoja = doc.internal.pageSize.getWidth()
  const centro = anchoHoja / 2
  const anchoUtil = anchoHoja - MARGEN * 2
  let y = MARGEN + 2

  // ── Encabezado centrado, como el formulario ──────────────────────
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(...COLORES.texto)
  LINEAS_INSTITUCIONALES.forEach((linea) => {
    doc.text(limpiarTextoPDF(linea), centro, y, { align: "center" })
    y += 4.8
  })

  y += 5
  doc.setFontSize(14)
  doc.text("DECLARACIÓN GENERAL", centro, y, { align: "center" })
  y += 5.5
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("(Salida/Entrada)", centro, y, { align: "center" })
  y += 10

  // ── Datos del vuelo: 2 renglones de 3 campos ─────────────────────
  const anchoCampo = anchoUtil / 3
  const fila1 = [
    ["AERONAVE", detalle.aeronave?.tipo],
    ["MATRÍCULA", detalle.aeronave?.matricula],
    ["DESTINO", textoDestino(detalle.itinerarios)],
  ]
  const fila2 = [
    ["MISIÓN", detalle.tipo_mision?.codigo],
    ["APOYO A", detalle.solicitante],
    ["FECHA", formatearFechaSoloDia(detalle.fecha)],
  ]
  for (const fila of [fila1, fila2]) {
    let altoFila = 4
    fila.forEach(([etiqueta, valor], i) => {
      altoFila = Math.max(altoFila, campo(doc, etiqueta, valor, MARGEN + i * anchoCampo, y, anchoCampo))
    })
    y += altoFila + 3
  }
  y += 4

  // ── Tripulación ──────────────────────────────────────────────────
  y = tituloSeccion(doc, y, "TRIPULACIÓN")
  y = tablaPDF(doc, {
    startY: y,
    variante: "formulario",
    tamanoLetra: 9,
    columnas: COLUMNAS_TRIPULACION,
    filas: detalle.tripulacion.length > 0
      ? detalle.tripulacion.map((t) => [
          t.persona.grado,
          `${t.persona.nombre} ${t.persona.apellido}`,
          FUNCIONES[t.rol_en_vuelo] || t.rol_en_vuelo || "",
        ])
      : [["", "Sin tripulación asignada", ""]],
  })
  y += 8

  // ── Pasajeros ────────────────────────────────────────────────────
  // Sin pasajeros: si el manifiesto lo confirmó, "Sin pasajeros"; si
  // simplemente no se cargó nada, "Sin pasajeros registrados".
  y = tituloSeccion(doc, y, "PASAJEROS")
  y = tablaPDF(doc, {
    startY: y,
    variante: "formulario",
    tamanoLetra: 9,
    columnas: COLUMNAS_PASAJEROS,
    filas: detalle.pasajeros.length > 0
      ? detalle.pasajeros.map((p) => [
          `${p.nombre} ${p.apellido}`,
          p.nacionalidad,
          p.nro_documento,
          "",
        ])
      : [[detalle.manifiesto_sin_pasajeros ? "Sin pasajeros" : "Sin pasajeros registrados", "", "", ""]],
  })
  y += 8

  // ── Carga ────────────────────────────────────────────────────────
  y = tituloSeccion(doc, y, "CARGA")
  y = tablaPDF(doc, {
    startY: y,
    variante: "formulario",
    tamanoLetra: 9,
    columnas: COLUMNAS_CARGA,
    filas: detalle.cargas.length > 0
      ? detalle.cargas.map((c) => [
          c.tipo,
          "",
          c.descripcion || "",
          c.peso != null && c.peso !== "" ? `${c.peso} kg` : "",
          "",
        ])
      : [[detalle.manifiesto_sin_carga ? "Sin carga" : "Sin carga registrada", "", "", "", ""]],
  })
  y += 10

  // ── DECLARO + firmas — siempre juntos y completos en la misma hoja ─
  doc.setFontSize(9)
  const etiquetaDeclaro = "DECLARO: "
  doc.setFont("helvetica", "bold")
  const anchoDeclaro = doc.getTextWidth(etiquetaDeclaro)
  doc.setFont("helvetica", "normal")
  const lineasDeclaro = doc.splitTextToSize(limpiarTextoPDF(TEXTO_DECLARO), anchoUtil - anchoDeclaro)
  const altoDeclaro = lineasDeclaro.length * 4.2
  const altoFirmas = 42

  y = asegurarEspacio(doc, y, altoDeclaro + altoFirmas)

  doc.setFont("helvetica", "bold")
  doc.text(etiquetaDeclaro, MARGEN, y)
  doc.setFont("helvetica", "normal")
  doc.text(lineasDeclaro, MARGEN + anchoDeclaro, y)
  y += altoDeclaro + 10

  doc.setFont("helvetica", "bold")
  doc.text("VERIFICADO POR:", MARGEN, y)
  y += 22

  // Dos líneas de firma: izquierda (verificado por) y derecha (piloto)
  const anchoLinea = 70
  const xIzquierda = MARGEN + 5
  const xDerecha = anchoHoja - MARGEN - 5 - anchoLinea
  doc.setDrawColor(...COLORES.texto)
  doc.setLineWidth(0.3)
  doc.line(xIzquierda, y, xIzquierda + anchoLinea, y)
  doc.line(xDerecha, y, xDerecha + anchoLinea, y)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.text("FIRMA Y ACLARACIÓN", xIzquierda + anchoLinea / 2, y + 4.5, { align: "center" })
  doc.text("PILOTO O REPRESENTANTE AUTORIZADO", xDerecha + anchoLinea / 2, y + 4.5, { align: "center" })
  doc.text("FIRMA Y ACLARACIÓN", xDerecha + anchoLinea / 2, y + 8.5, { align: "center" })

  pieDePaginaPDF(doc)

  doc.save(nombreArchivoPDF("declaracion-general", detalle.nro_orden || `escala-${detalle.id}`))
}