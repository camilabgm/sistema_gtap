import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Personas' }).click();
});

// =================================================
// TEST 1: La página de personas carga correctamente
// =================================================
test('pagina de personas carga y muestra boton nueva persona', async ({ page }) => {
  await expect(page).toHaveURL(/personas/);
  await expect(page.getByRole('button', { name: '+ Nueva persona' })).toBeVisible();
});

// =================================================
// TEST 2: Crear persona nueva con todos los campos
// IMPORTANTE: Cambiar el CI si corrés este test más de una vez
// =================================================
test('crear persona nueva con datos completos', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva persona' }).click();

  // Llenar todos los campos
  await page.getByRole('textbox', { name: 'Álvaro' }).fill('PersonaPrueba');
  await page.getByRole('textbox', { name: 'López Cattebeke' }).fill('ApellidoPrueba');
  await page.getByRole('textbox', { name: '1234567' }).fill('55001001');
  await page.locator('input[type="date"]').fill('1990-06-15');
  await page.getByRole('textbox', { name: 'TCNEL DCEM' }).fill('Tte 1°');
  await page.getByRole('textbox', { name: 'Comandancia GTAP' }).fill('Escuadron Aereo');
  await page.getByRole('combobox').nth(3).selectOption('PILOTO');

  // Guardar
  await page.getByRole('button', { name: 'Crear persona' }).click();

  // Verificar que aparece en la lista
  await expect(page.getByText('PersonaPrueba')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('ApellidoPrueba')).toBeVisible();
});

// =================================================
// TEST 3: Abrir formulario y cancelar sin guardar
// =================================================

test('abrir formulario nueva persona y cancelar no crea registro', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva persona' }).click();

  // Llenar algo pero no guardar
  await page.getByRole('textbox', { name: 'Álvaro' }).fill('NombreQueNoDebeExistir');

  // Hacer clic en Cancelar
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // Verificar que el nombre no aparece en la lista
  await expect(page.getByText('NombreQueNoDebeExistir')).not.toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 4: Desactivar una persona muestra confirmación
// =================================================
test('desactivar persona pide confirmacion', async ({ page }) => {
  let dialogMessage = '';

  // Escuchar el diálogo de confirmación
  page.once('dialog', async dialog => {
    dialogMessage = dialog.message();
    await dialog.dismiss(); // Cancelamos para no desactivar realmente
  });

  // Clic en desactivar de alguna persona
  const botonDesactivar = page.getByRole('button', { name: 'Desactivar' }).first();
  if (await botonDesactivar.isVisible()) {
    await botonDesactivar.click();

    // Verificar que apareció un diálogo
    expect(dialogMessage.length).toBeGreaterThan(0);
  }
});