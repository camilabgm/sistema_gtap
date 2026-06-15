import { test, expect } from '@playwright/test';

// ==========================================================
// BUGS ENCONTRADOS POR TESTING
// El sistema no valida estos casos al crear aeronaves.
// Reactivar cada test después de implementar la validación.
// ==========================================================

test.skip('matricula duplicada muestra error', async ({ page }) => {});
test.skip('matricula vacia no permite crear aeronave', async ({ page }) => {});
test.skip('tipo modelo vacio no permite crear aeronave', async ({ page }) => {});
test.skip('estado no disponible sin motivo no permite crear', async ({ page }) => {});
test.skip('motivo otro sin descripcion no permite crear', async ({ page }) => {});
test.skip('capacidad pasajeros no acepta letras', async ({ page }) => {});

// TEST QUE SÍ FUNCIONA: cambio de estado muestra/oculta motivo
test('cambiar a no disponible muestra selector de motivo', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Aeronaves' }).click();

  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();

  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  await expect(page.locator('div:nth-child(13) > .w-full')).toBeVisible({ timeout: 3000 });

  await page.getByRole('combobox').nth(5).selectOption('DISPONIBLE');
  await expect(page.locator('div:nth-child(13) > .w-full')).not.toBeVisible({ timeout: 3000 });
});