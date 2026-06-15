import { test, expect } from '@playwright/test';

// ============================================
// Función auxiliar para hacer login rápido
// ============================================
async function hacerLogin(page) {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// ============================================
// TEST 1: Cerrar sesión redirige al login
// ============================================
test('cerrar sesion redirige al login', async ({ page }) => {
  // Hacer login primero
  await hacerLogin(page);

  // Buscar y hacer clic en cerrar sesión
  await page.getByRole('button', { name: /cerrar sesión|salir/i }).click();

  // Verificar que volvemos al login
  await page.waitForURL('**/login', { timeout: 15000 });
  await expect(page).toHaveURL(/login/);
});

// ============================================
// TEST 2: Después de cerrar sesión, no puedo
//         volver al dashboard
// ============================================
test('despues de cerrar sesion no se puede acceder al dashboard', async ({ page }) => {
  // Hacer login
  await hacerLogin(page);

  // Cerrar sesión
  await page.getByRole('button', { name: /cerrar sesión|salir/i }).click();
  await page.waitForURL('**/login', { timeout: 15000 });

  // Intentar volver al dashboard directamente
  await page.goto('http://localhost:3000/dashboard');

  // Debe redirigir al login de nuevo
  await page.waitForURL('**/login', { timeout: 15000 });
  await expect(page).toHaveURL(/login/);
});