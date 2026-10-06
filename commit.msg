feat: Registro de Accesos paginado y filtrado en el servidor

Antes traía los últimos 200 intentos (take: 200) y la tabla filtraba
en el navegador: del intento 201 en adelante no se veía nada, ni
buscándolo.

page.js:
- Lee ?pagina=, ?usuario= y ?resultado= de la URL (await, Next 16)
- Valida el resultado contra el enum ResultadoLogin de Prisma (un
  valor inválido se ignora en vez de dar error 500)
- count + findMany con skip/take, orden por fecha con desempate por id
- Sin el límite de 200: se llega a todo el historial

TablaLogIntentos.js:
- Ya no filtra: los controles cambian la URL
- Buscador con espera de 400ms después de la última tecla
  (router.replace, sin mover el scroll); select y paginación con
  router.push para que Atrás funcione
- No pisa lo que se está escribiendo cuando llega la respuesta, y se
  sincroniza con la URL al usar Atrás
- useTransition: tabla atenuada y paginación deshabilitada mientras
  carga
- Barra de Paginacion debajo de la tabla; subtítulo "Historial
  completo"
  chore: nombres de archivos de paginación sin choque de mayúsculas

lib/paginacion.js y components/shared/Paginacion.js solo se
diferenciaban en la mayúscula de la P. Windows los trata como el
mismo nombre y Git terminó con el de lib registrado como
Paginacion.js: en Windows funciona, pero en el servidor Linux el
import "@/lib/paginacion" no lo encontraría.

- lib/paginacion.js con su nombre en minúscula en Git
- El componente pasa a llamarse BarraPaginacion.js

lib/paginacion.js: suma ESPERA_BUSQUEDA_MS = 400.