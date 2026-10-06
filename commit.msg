feat: Declaración General e Informe de Vuelos estilo Memo 40

Manifiesto → Declaración General (Salida/Entrada), calcada del
formulario del GTAP:
- Datos del vuelo, "Apoyo a" (solicitante) y fecha
- Tripulación, pasajeros y carga en grilla tipo formulario
- Texto "DECLARO:" y firmas de "Verificado por" y del piloto
- Una declaración por misión, sin horas ni combustible

Informe de Vuelos → formato Memo 40 (horizontal):
- Mes, día, avión, matrícula, solicitante, misión (celda azul),
  tiempo de vuelo en hh:mm, ruta completa, tripulación, combustible,
  pax/carga y observación del Post-Vuelo
- Fila de totales al final (vuelos, horas, combustible, pax, carga)
- Sin columna Código
- Corrige la zona horaria en la API de informes

API del Manifiesto: devuelve los itinerarios. Se pedían a la base
pero no se mandaban, y por eso DESTINO salía "—" y la línea de ruta
del panel nunca se mostraba.

basePDF.js:
- tablaPDF: variante "formulario", filaTotales y personalizarCelda
  (opcionales; los exportadores existentes quedan igual)
- nombreArchivoPDF limpia caracteres inválidos ("GTAP/0001")