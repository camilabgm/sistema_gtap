# verificar-archivos.ps1
#
# Revisa los ~30 archivos que fuimos armando en esta rama y confirma si
# tienen la versión más reciente — busca una marca puntual (una línea o
# palabra que SOLO existe en la versión corregida) en cada uno.
#
# Correr desde la raíz del proyecto: .\verificar-archivos.ps1

function Test-Fingerprint {
    param(
        [string]$Path,
        [string]$Pattern,
        [bool]$DebeEncontrarse = $true,
        [string]$Descripcion
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        Write-Host "[NO EXISTE] $Descripcion -- no se encontró el archivo: $Path" -ForegroundColor Red
        return
    }
    $encontrado = Select-String -LiteralPath $Path -Pattern $Pattern -SimpleMatch -Quiet
    if ($DebeEncontrarse) {
        if ($encontrado) {
            Write-Host "[OK]      $Descripcion" -ForegroundColor Green
        } else {
            Write-Host "[REVISAR] $Descripcion -- falta actualizar ($Path)" -ForegroundColor Yellow
        }
    } else {
        if ($encontrado) {
            Write-Host "[REVISAR] $Descripcion -- todavía tiene código viejo ($Path)" -ForegroundColor Yellow
        } else {
            Write-Host "[OK]      $Descripcion" -ForegroundColor Green
        }
    }
}

Write-Host "`n=== Schema y seed ===" -ForegroundColor Cyan
Test-Fingerprint "prisma\schema.prisma" "carga_kg" $true "schema.prisma - campo carga_kg en PostVuelo"
Test-Fingerprint "prisma\seed.js" "Jefe de Combustible" $true "seed.js - rol Jefe de Combustible en la matriz"

Write-Host "`n=== Auth y lib ===" -ForegroundColor Cyan
Test-Fingerprint "src\auth.js" "esSupervisorSemana" $true "auth.js - flag esSupervisorSemana"
Test-Fingerprint "src\auth.js" "esTecnicoDeVuelo" $false "auth.js - sin el flag esTecnicoDeVuelo (se sacó, quedó sin uso)"
Test-Fingerprint "src\lib\manifiesto.js" "esTecnicoDeVueloAsignado" $false "manifiesto.js - sin esTecnicoDeVueloAsignado (se revirtió)"
Test-Fingerprint "src\lib\manifiesto.js" "Comandante del Escuadrón de Mantenimiento" $false "manifiesto.js - ROLES_GLOBAL_MANIFIESTO con 3 roles, no 4"
Test-Fingerprint "src\lib\postVuelo.js" "Jefe de Programación y Control" $true "postVuelo.js - ROLES_GLOBAL_POST_VUELO correcto"
Test-Fingerprint "src\lib\postVuelo.js" "carga_kg_sugerida" $true "postVuelo.js - sugiere carga desde Manifiesto"
Test-Fingerprint "src\lib\auditoria.js" "resolverNombresUsuarios" $true "auditoria.js - existe"

Write-Host "`n=== API: Escalas ===" -ForegroundColor Cyan
Test-Fingerprint "src\app\api\escalas\route.js" "resolverNombresUsuarios" $true "escalas/route.js - resuelve nombres para auditoría"
Test-Fingerprint "src\app\api\escalas\[id]\autorizar\route.js" "rolSupervisorSemana" $true "autorizar/route.js - busca supervisor por rol_secundario"
Test-Fingerprint "src\app\api\escalas\[id]\itinerarios\[itinerarioId]\real\route.js" "ROLES_GLOBAL_POST_VUELO" $true "real/route.js - usa ROLES_GLOBAL_POST_VUELO"

Write-Host "`n=== API: Post-Vuelo ===" -ForegroundColor Cyan
Test-Fingerprint "src\app\api\escalas\[id]\post-vuelo\route.js" "puedeEditarCombustible" $true "post-vuelo/route.js - incluye puedeEditarCombustible"
Test-Fingerprint "src\app\api\escalas\[id]\post-vuelo\route.js" "carga_kg" $true "post-vuelo/route.js - maneja carga_kg"
Test-Fingerprint "src\app\api\escalas\[id]\post-vuelo\combustible\route.js" "esJefeCombustibleOSupervisor" $true "combustible/route.js - una sola vez para los dos roles"
Test-Fingerprint "src\app\api\post-vuelo\route.js" "post_vuelos[0]" $true "api/post-vuelo/route.js -- EL BUG QUE ACABAMOS DE ENCONTRAR"
Test-Fingerprint "src\app\api\post-vuelo\route.js" "tienePostVuelo" $false "api/post-vuelo/route.js -- sin la variable booleana vieja"

Write-Host "`n=== API: Manifiesto ===" -ForegroundColor Cyan
Test-Fingerprint "src\app\api\manifiesto\route.js" "SUPERVISOR_SEMANA" $false "manifiesto/route.js (lista) - sin el select viejo de acuses"
Test-Fingerprint "src\app\api\manifiesto\[escalaId]\route.js" "manifiesto_creado_por_nombre" $true "manifiesto/[escalaId]/route.js - trae nombres resueltos"
Test-Fingerprint "src\app\api\manifiesto\[escalaId]\route.js" "es_borrador" $true "manifiesto/[escalaId]/route.js - trae es_borrador (estado detallado)"
Test-Fingerprint "src\app\api\manifiesto\[escalaId]\cerrar\route.js" "SUPERVISOR_SEMANA" $false "manifiesto/cerrar/route.js - sin el select viejo de acuses"
Test-Fingerprint "src\app\api\manifiesto\[escalaId]\cargas\route.js" "manifiesto_creado_por" $true "manifiesto/cargas (POST) - marca manifiesto_creado_por"
Test-Fingerprint "src\app\api\manifiesto\cargas\[id]\route.js" "SUPERVISOR_SEMANA" $false "manifiesto/cargas/[id] - sin el select viejo de acuses"
Test-Fingerprint "src\app\api\manifiesto\[escalaId]\pasajeros\route.js" "manifiesto_creado_por" $true "manifiesto/pasajeros (POST) - marca manifiesto_creado_por"
Test-Fingerprint "src\app\api\manifiesto\pasajeros\[id]\route.js" "SUPERVISOR_SEMANA" $false "manifiesto/pasajeros/[id] - sin el select viejo de acuses"

Write-Host "`n=== API: Personas y Usuarios ===" -ForegroundColor Cyan
Test-Fingerprint "src\app\api\personas\route.js" "rol_secundario" $true "personas/route.js - trae la relación rol_secundario"
Test-Fingerprint "src\app\api\usuarios\[id]\route.js" "rol_secundario_asignado_por" $true "usuarios/[id]/route.js - maneja rol secundario"
Test-Fingerprint "src\app\api\usuarios\route.js" "rol_secundario_asignado_por" $true "usuarios/route.js (POST) - soporta rol secundario desde el alta"
Test-Fingerprint "src\app\dashboard\personas\page.js" "rol_secundario" $true "dashboard/personas/page.js - incluye rol_secundario"

Write-Host "`n=== Componentes ===" -ForegroundColor Cyan
Test-Fingerprint "src\components\personas\UsuarioModal.js" "rolesParaPrincipal" $true "UsuarioModal.js -- Supervisor de Semana afuera del rol principal"
Test-Fingerprint "src\components\personas\PersonasTable.js" "rol_secundario" $true "PersonasTable.js - badge de rol secundario"
Test-Fingerprint "src\components\shared\PanelAuditoria.js" "formatearFecha" $true "PanelAuditoria.js - existe"
Test-Fingerprint "src\components\escalas\PanelDetalleEscala.js" "manifiestoEstaCerrado" $true "PanelDetalleEscala.js - detecta cierre automático de Manifiesto"
Test-Fingerprint "src\components\manifiesto\PanelDetalle.js" "cerradoAutomaticamente" $true "manifiesto/PanelDetalle.js - badge de cierre automático"
Test-Fingerprint "src\components\postVuelo\PanelPostVuelo.js" "pvCargaKg" $true "PanelPostVuelo.js - campo de carga (kg)"
Test-Fingerprint "src\components\postVuelo\PanelPostVuelo.js" "puedeEditarCombustible" $true "PanelPostVuelo.js - bloque de cargar combustible"

Write-Host "`n=== Middleware ===" -ForegroundColor Cyan
Test-Fingerprint "src\middleware.js" "sesionInvalidada" $true "src/middleware.js - chequeo de sesión invalidada"

Write-Host "`n=== Fin de la verificación ===`n" -ForegroundColor Cyan
