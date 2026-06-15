import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
});

test('gestion de permisos carga correctamente', async ({ page }) => {
  await page.getByRole('link', { name: 'Gestión de Permisos' }).click();

  await expect(page).toHaveURL(/administracion\/permisos/);
  await expect(page.getByRole('heading', { name: 'Gestión de Permisos' })).toBeVisible({ timeout: 15000 });
});

test('registro de accesos carga correctamente', async ({ page }) => {
  await page.getByRole('link', { name: 'Registro de Accesos' }).click();

  await expect(page).toHaveURL(/administracion\/log-intentos/);
  await expect(page.getByRole('heading', { name: 'Registro de Intentos de Login' })).toBeVisible({ timeout: 15000 });
});

test('registro de accesos muestra historial de logins', async ({ page }) => {
  await page.getByRole('link', { name: 'Registro de Accesos' }).click();

  await expect(page.getByText('1234').first()).toBeVisible({ timeout: 15000 });
});