fix: listados responsive en tres zonas + encabezado compartido

Los listados cambiaban de tarjetas a tabla en 768px, pero en tablet
(y en notebooks de 1024 con el sidebar) las tablas no entraban: se
pisaban encabezados, badges y acciones, o la columna de Acciones
quedaba recortada sin aviso.

EncabezadoPagina (shared, nuevo):
- Título, subtítulo, acciones y contenido de la tarjeta superior
- En celular el botón baja debajo del subtítulo (antes se salía)
- Prop volverAInicio para el "Volver" de celular, siempre arriba
- Aplicado en 15 módulos

Tablas desde 1024px, tarjetas por debajo:
- Personas, Aeronaves, Tipos de Misión, Gestión de Escalas, SICEM
  Eventos y Alertas, Informe de Vuelos (tarjetas nuevas)
- AccionIcono y AbortarEscalaAccion: etiquetas visibles hasta 1024px
- Personas y SICEM Eventos: entre 1024 y 1279px las columnas menos
  importantes se pliegan debajo del nombre/matrícula
- Gestión de Escalas: columna Acciones 26% -> 30%
- overflow-hidden -> overflow-x-auto en tablas que recortaban la
  última columna (Aeronaves, Tipos, Estadística SICEM, Totales)

Ajustes puntuales:
- Agenda: semana en grilla de 7 columnas iguales
- Informe Totales: pestañas deslizables de costado
- SICEM Componentes: grilla 1/2/3 columnas
- Pendientes de Autorizar: botón Autorizar debajo en celular
- Registro de Accesos: título dentro del componente, "Volver" arriba
- Filtros con flex-wrap donde faltaba

18 archivos (1 nuevo).