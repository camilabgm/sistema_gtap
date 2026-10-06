fix: base común para los PDFs (encabezado, tabla, pie, márgenes)

Cada exportador tenía su propia copia de colores, encabezado, pie y
márgenes (12, 14 o 15mm), y Gestión de Escalas usaba otro color y
otra técnica. La flecha "→" rompía la ruta ("S G A S").

pdf/basePDF.js (nuevo, compartido):
- limpiarTextoPDF: reemplaza o descarta caracteres que la fuente del
  PDF no tiene (→, ✓, ✗, espacios raros)
- encabezadoPDF: FAP / I Brigada Aérea / GTAP, título, filtros y
  "Generado" en hora de Paraguay
- tablaPDF: autoTable con estilo único (azul marino, filas cebra,
  encabezado repetido en cada hoja)
- pieDePaginaPDF: "Página X de Y"
- nombreArchivoPDF / fechaHoyParaguayISO
- Márgenes de 15mm en todos

Exportadores migrados (mismo contenido):
- Gestión de Escalas: estilo de los Informes, ruta sin flecha,
  misión solo con el código, anchos fijos, filtros aplicados
- Informe de Totales y Progreso Anual: tabla con autoTable en vez
  de dibujarla a mano, período en dd/mm/aaaa
- HistorialEscalas: describirFiltros() le pasa los filtros al PDF

Manifiesto e Informe de Vuelos sin cambios (se rehacen en la rama
siguiente sobre esta base).

5 archivos (1 nuevo).