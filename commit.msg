fix: maestro-detalle en tablet, formularios internos y fechas en 24 h

Manifiesto y Post-Vuelo mostraban lista y detalle mitad y mitad en
768px: con el sidebar, el detalle quedaba con unos 300px. Además,
las fechas en formato de 12 horas daban errores de hidratación.

Maestro-detalle (useVistaMobileMaestroDetalle + 2 pantallas):
- Usa usePantallaCompacta (1024px) en vez de useDeviceType (768px):
  en celular Y tablet se ve lista o detalle de a uno
- Devuelve "esCompacta" en vez de "esMobile"
- Desde 1024px lado a lado: lista 40% con máximo de 384px, el
  detalle con todo el resto
- "Volver a Inicio" solo en celular

Manifiesto:
- PanelDetalle: celdas que no se pisan, botones alineados con el
  título, acciones de pasajero/carga con flex-wrap
- FormularioPasajero y FormularioCarga: etiqueta visible en cada
  campo (antes solo placeholder, que se cortaba)

Post-Vuelo (PanelPostVuelo):
- Datos de la escala en 2 columnas en celular
- Corrección de combustible: el botón ya no se sale
- Cierre: campos alineados, "Sugerido por el Manifiesto" debajo

Escala (FormularioEscala + EditarEscala):
- Cartel de disponibilidad y su botón apilados en celular
- Tramos del itinerario en 1/2/5 columnas
- Padding de pantalla más chico en celular

SICEM: SicemDatosGeneralesAeronave en 1/2/3 columnas.

Fechas en 24 horas con el formateador compartido de fechaHora.js:
- escalas.js (formatearHora, formatearFechaHoraCompacta),
  PanelAuditoria, InformeVuelos
- Corrige el error de hidratación por el espacio invisible antes
  de "a. m." (Node y Chrome usan caracteres distintos)
- ParteDiarioPage: fecha de hoy con hora de Paraguay explícita

14 archivos modificados.