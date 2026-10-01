feat: responsive mobile para todo el sistema GTAP

Adapta las 10 secciones del sistema a mobile (<768px), manteniendo
intacto el comportamiento de escritorio en todos los casos.

Navegacion mobile:
- useDeviceType: hook central de deteccion mobile/desktop
- BarraNavegacionInferior + navegacionMobile.js: barra fija con 4
  accesos + "Mas", prioridad de modulos segun permisos
- SubNavEscalas / SubNavSicem: submenu de pestanas para los modulos
  con sub-secciones propias (Escalas: Agenda/Gestion/Aprobaciones/
  Cargos; SICEM: Alertas/Componentes/Eventos/Estadistica), con sus
  badges de pendientes y "Volver a Inicio"
- BotonVolver / BotonVolverInicio (shared): navegacion de vuelta,
  por historial real o fija al Dashboard segun el caso
- useVistaMobileMaestroDetalle: patron lista-detalle para Post-Vuelo
  y Manifiesto

Tablas de gestion a tarjetas en mobile:
- HistorialEscalas, PersonasTable, AeronavesTable, TiposMisionesTable,
  SicemEventosTable: tabla completa en desktop, tarjetas apiladas con
  acciones agrupadas en mobile (logica de permisos extraida a un
  componente compartido por tabla, sin duplicar entre las dos vistas)

Formularios y paneles:
- Grillas de N columnas (FormularioEscala, EditarEscala, PersonasForm,
  AeronavesForm, SicemComponentesForm, SicemEventosForm,
  HabilitacionesModal, PanelVerAeronave, PanelVerEvento, etc.) pasan
  de fijas a apiladas en mobile, en fila desde 768px

Fixes estructurales (afectan a todo el sistema, no solo mobile):
- DashboardShell: min-w-0 en <main> - corrige que contenido ancho
  (tablas, graficos) desbordara el layout completo en vez de
  scrollear contenido, al ser <main> un item de flexbox
- Tablas con muchas columnas (PersonasTable, SicemEventosTable):
  table-fixed + colgroup con anchos explicitos - el layout automatico
  recortaba la columna de Acciones con el sidebar expandido
- overflow-hidden a overflow-x-auto en tablas/modales que recortaban
  contenido ancho en vez de permitir scroll (PermisosUsuarioModal,
  SicemEstadisticasPanel)
- Agrupamiento de pares etiqueta+input (Desde/Hasta) para que el
  flex-wrap mueva el par completo, no el texto suelto de un lado

54 archivos modificados. Sin cambios de comportamiento en escritorio
en ningun modulo - verificado modulo por modulo durante el desarrollo.