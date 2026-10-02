fix: botones de acción legibles en mobile (AccionIcono)

En pantallas táctiles el tooltip de AccionIcono no servía: tocar el
ícono abría el globo y ejecutaba la acción al mismo tiempo. Ahora,
debajo de 768px, cada botón muestra su etiqueta como texto visible.

AccionIcono (shared):
- Etiqueta visible en mobile (md:hidden), ancho automático
- Tooltip solo en dispositivos con mouse y desde 768px
- Nueva prop opcional "tooltip": separa el nombre corto de la acción
  (lo que se lee en mobile) de la explicación larga (globo de
  escritorio y lectores de pantalla). Compatible con todos los usos
  existentes

Filas de acciones que se cortaban o se salían de la tarjeta:
- HistorialEscalas: flex-wrap en mobile, grupos con "contents" para
  repartir los botones de a uno, etiquetas cortas + tooltip en las
  acciones bloqueadas
- AbortarEscalaAccion: misma forma de botón, etiqueta "Abortar"
- AeronavesTable: etiquetas cortas de disponibilidad + tooltip,
  flex-wrap en mobile
- ParteDiarioPage: flex-wrap en la fila de cada novedad
- SicemComponentesTable: flex-wrap en la fila de cada tarjeta (caso
  640-767px con la grilla en 3 columnas)

Desktop sin cambios en ningún módulo.
6 archivos modificados.
