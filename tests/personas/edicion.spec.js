import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Personas' }).click();
});

test('editar persona abre formulario con datos cargados', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // El formulario debe abrirse con el botón "Guardar cambios"
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible({ timeout: 5000 });

  // Los campos deben tener datos (no estar vacíos)
  const nombre = await page.getByRole('textbox', { name: 'Álvaro' }).inputValue();
  expect(nombre.length).toBeGreaterThan(0);
});

test('editar especialidad de persona y guardar', async ({ page }) => {
  // Editar la primera persona
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Guardar el valor actual para restaurar después
  const valorOriginal = await page.getByRole('combobox').nth(3).inputValue();

  // Cambiar especialidad
  await page.getByRole('combobox').nth(3).selectOption('OTRO');

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  // Verificar que el cambio se guardó (la lista se actualiza)
  await expect(page.getByRole('button', { name: '+ Nueva persona' })).toBeVisible({ timeout: 10000 });

  // Restaurar el valor original
  await page.getByRole('button', { name: 'Editar' }).first().click();
  await page.getByRole('combobox').nth(3).selectOption(valorOriginal || 'PILOTO');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
});

test('editar persona con nombre vacio muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Borrar el nombre
  await page.getByRole('textbox', { name: 'Álvaro' }).clear();

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  // Debe mostrar error o el formulario sigue abierto
  await expect(page.getByText(/nombre es obligatorio/i)).toBeVisible({ timeout: 5000 });
});

test('editar persona con apellido vacio muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'López Cattebeke' }).clear();

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByText(/apellido es obligatorio/i)).toBeVisible({ timeout: 5000 });
});

test('editar persona con CI no numerico muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: '1234567' }).clear();
  await page.getByRole('textbox', { name: '1234567' }).fill('ABC123');

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByText(/solo números/i)).toBeVisible({ timeout: 5000 });
});

test('cancelar edicion de persona no modifica datos', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Cambiar algo
  await page.getByRole('textbox', { name: 'Álvaro' }).clear();
  await page.getByRole('textbox', { name: 'Álvaro' }).fill('MODIFICADO');

  // Cancelar
  await page.getByRole('button', { name: 'Cancelar' }).click();

  // El nombre modificado no debe aparecer en la lista
  await expect(page.getByText('MODIFICADO')).not.toBeVisible({ timeout: 5000 });
});