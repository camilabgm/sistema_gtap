feat: SICEM Eventos paginado y filtrado en el servidor

page.js:
- Lee ?pagina=, ?aeronave= y ?estado= de la URL (await, Next 16)
- ?aeronave= solo vale si es una aeronave del select; ?estado= solo
  ABIERTOS o CERRADOS; valores inválidos se ignoran
- count + findMany con skip/take, orden por fecha con desempate por id
- GET /api/sicem/eventos sin cambios (lo usa SicemEstadisticasPanel)

SicemEventosTable.js:
- Sin copia local de los eventos: useState(datosIniciales) solo toma
  el valor la primera vez y no se enteraba de la página nueva
- Selects → URL con router.push, vuelven a la página 1
- Recarga con router.refresh(): misma página y mismos filtros después
  de guardar, cerrar o eliminar
- useTransition: listado atenuado y Cerrar/Eliminar deshabilitados
  mientras recarga
- BarraPaginacion debajo de la tabla y las tarjetas