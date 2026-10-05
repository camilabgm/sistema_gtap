fix: base responsive en tres zonas (celular, tablet, computadora)

La tablet heredaba el layout de escritorio, y en 768-1279px las
tablas quedaban con menos de 500px con el sidebar abierto. Esta rama
arma la estructura para tres zonas, sin tocar todavía los listados.

useDeviceType (hooks):
- useMediaQuery interno, compartido por tres hooks
- useDeviceType: sin cambios para quien ya lo usa (<768)
- usePantallaCompacta (<1024) y useMenuFlotante (<1280), nuevos
- Cortes alineados con Tailwind (md 768, lg 1024, xl 1280)

Sidebar (Navbar + DashboardShell):
- Cerrado: 80px con ícono + nombre corto debajo (Misiones,
  Pendientes, Cargos, Permisos, Accesos, Clave, Salir)
- 768-1279px: arranca cerrado y, al abrirlo, flota encima de la
  página con fondo gris; se cierra al tocar el fondo o al navegar
- 1280px o más: sin cambios, abierto y empujando
- Sin parpadeo: el estado por defecto se calcula en el mismo render

SubItemEscalas (shared): ícono + nombre con el sidebar cerrado.
SeparadorSeccion (shared): el texto se parte en dos renglones en vez
de salirse en paneles angostos.
DashboardShell: padding de main p-2 en celular (antes p-6).
Login: margen externo y padding más chico en celular.

Barra inferior de mobile sin cambios.
6 archivos modificados.