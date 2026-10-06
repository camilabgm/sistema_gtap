feat: piezas compartidas de paginación del lado del servidor

lib/paginacion.js (nuevo):
- REGISTROS_POR_PAGINA = 20, en un solo lugar
- leerPagina: convierte ?pagina= de la URL en un número seguro
  (valores inválidos → 1)
- datosPaginacion: skip/take para Prisma y total de páginas; si la
  página pedida no existe, devuelve la última que sí existe

components/shared/Paginacion.js (nuevo):
- Barra común: "Mostrando 21–40 de 312" + Anterior / números /
  Siguiente desde 640px; "Página X de Y" en celular, botones de 40px
- Solo dibuja: avisa el cambio con onCambiar y cada módulo decide
  (URL o estado)
- Una sola página: solo el conteo; sin registros: nada

Todavía no lo usa ningún módulo (empieza en el commit siguiente,
Registro de Accesos).