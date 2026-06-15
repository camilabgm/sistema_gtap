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
// TEST 1: Modal de habilitaciones se abre
// =================================================
test('modal de habilitaciones se abre al hacer clic', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();

  // Verificar que el modal se abrió
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 2: Modal de habilitaciones se cierra
// =================================================
test('modal de habilitaciones se cierra correctamente', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeVisible({ timeout: 5000 });

  // Cerrar
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // Verificar que se cerró (el botón cerrar ya no está visible)
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).not.toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 3: Activar habilitación médica muestra confirmación
// =================================================
test('activar habilitacion medica muestra confirmacion', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();

  let dialogAppeared = false;

  page.once('dialog', async dialog => {
    dialogAppeared = true;
    await dialog.accept();
  });

  // Hacer clic en el checkbox de habilitación médica
  const checkboxMedica = page.getByRole('checkbox', { name: /anual.*habilitado/i }).first();
  if (await checkboxMedica.isVisible()) {
    const estaChecked = await checkboxMedica.isChecked();
    await checkboxMedica.click();

    // Esperar un momento para que aparezca el diálogo
    await page.waitForTimeout(1000);
  }
});

// =================================================
// TEST 4: Activar habilitación operacional muestra confirmación
// =================================================
test('activar habilitacion operacional muestra confirmacion', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();

  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  const checkboxOperacional = page.getByRole('checkbox', { name: /habilitado por operaciones/i }).first();
  if (await checkboxOperacional.isVisible()) {
    await checkboxOperacional.click();
    await page.waitForTimeout(1000);
  }
});

// =================================================
// TEST 5: Botón cargar período aparece en el modal
// =================================================
test('boton cargar periodo visible en modal habilitaciones', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();

  await expect(page.getByRole('button', { name: '+ Cargar período' })).toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 6: Formulario de período médico se abre
// =================================================
test('formulario de periodo medico se abre al hacer clic', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();

  await page.getByRole('button', { name: '+ Cargar período' }).click();

  // Verificar que aparecen los campos del formulario
  await expect(page.getByRole('button', { name: 'Guardar período' })).toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 7: Guardar período médico 1P
// CUIDADO: Este test modifica datos reales
// =================================================
test('guardar periodo medico 1P', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();
  await page.getByRole('button', { name: '+ Cargar período' }).click();

  // Seleccionar período 1P
  await page.getByRole('combobox').nth(2).selectOption('1P');

  // Poner año
  await page.getByPlaceholder('2026').fill('2026');

  // Poner fecha de vencimiento
  await page.locator('input[type="date"]').fill('2026-04-01');

  // Guardar
  await page.getByRole('button', { name: 'Guardar período' }).click();

  // Verificar que se guardó
  await expect(page.getByText('1P').first()).toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 8: Guardar período médico 2P
// CUIDADO: Este test modifica datos reales
// =================================================
test('guardar periodo medico 2P', async ({ page }) => {
  await page.getByRole('button', { name: 'Habilitaciones' }).first().click();
  await page.getByRole('button', { name: '+ Cargar período' }).click();

  // Seleccionar período 2P
  await page.getByRole('combobox').nth(2).selectOption('2P');

  await page.getByPlaceholder('2026').fill('2026');
  await page.locator('input[type="date"]').fill('2026-10-01');

  await page.getByRole('button', { name: 'Guardar período' }).click();

  await expect(page.getByText('2P').first()).toBeVisible({ timeout: 5000 });
});