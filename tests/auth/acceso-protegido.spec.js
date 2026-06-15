import { test, expect } from '@playwright/test';

// Todas las rutas que deben estar protegidas
// Si alguien intenta entrar sin login, debe redirigir al login
const rutasProtegidas = [
  '/dashboard',
  '/dashboard/personas',
  '/dashboard/aeronaves',
  '/dashboard/tipos-misiones',
  '/dashboard/escalas',
  '/dashboard/manifiesto',
  '/dashboard/informes',
  '/dashboard/sicem',
  '/dashboard/administracion/permisos',
  '/dashboard/administracion/log-intentos',
];

// Esto crea un test por cada ruta automáticamente
for (const ruta of rutasProtegidas) {
  test(`acceso a ${ruta} sin login redirige al login`, async ({ page }) => {
    // Intentar ir directo a la ruta sin hacer login
    await page.goto(`http://localhost:3000${ruta}`);

    // Debe redirigir al login
    await page.waitForURL('**/login', { timeout: 15000 });
    await expect(page).toHaveURL(/login/);
  });
}