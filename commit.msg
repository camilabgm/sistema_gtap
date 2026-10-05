fix: modales responsive con cáscara compartida (ModalBase)

En celular varios modales eran más altos que la pantalla, sin scroll
interno (los últimos campos y el botón Guardar quedaban afuera), o
tenían grillas de columnas fijas que se cortaban a la derecha.

ModalBase (shared, nuevo):
- Celular: pantalla completa, título y botones fijos, solo el
  contenido se desplaza
- Desde 640px: centrado, alto máximo 90%, ancho por modal
- Esc cierra todos los modales
- Tocar el fondo no cierra los formularios (sí los paneles de Ver)
- Bloquea el scroll de la página de atrás
- Portal a body con z-50
- Error fuera del scroll, justo arriba de los botones

Aplicado en 13 modales:
- Aeronaves: AeronavesForm, AeronaveDisponibilidadModal,
  PanelVerAeronave
- Personas: PersonasForm, UsuarioModal, PermisosUsuarioModal,
  HabilitacionesModal (solo la cáscara)
- Tipos de Misión: TiposMisionesForm, PanelVerTipoMision
- SICEM: SicemComponentesForm, SicemEventosForm, PanelVerEvento
- Parte Diario: modal de novedad

Grillas corregidas:
- SicemComponentesForm: grid-cols-2/3 fijos -> 1 columna en celular
- PersonasForm: datos institucionales a 1 columna en celular y
  col-span-2 -> sm:col-span-2 (creaba una columna fantasma)
- Parte Diario: lista del buscador de personas en el flujo normal

14 archivos (1 nuevo).