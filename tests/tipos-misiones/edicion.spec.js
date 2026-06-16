import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Tipos de Misiones' }).click();
});

test('editar tipo de mision abre formulario con datos', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Debe mostrar el heading de edición
  await expect(page.getByRole('heading', { name: 'Editar Tipo de Misión' })).toBeVisible({ timeout: 5000 });
});

test('editar tipo de mision y guardar', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Cambiar la clasificación
  const comboClasificacion = page.getByRole('combobox').nth(1);
  const valorOriginal = await comboClasificacion.inputValue();

  await comboClasificacion.selectOption('LOGISTICA');
  await page.getByRole('button', { name: 'Guardar' }).click();

  // Verificar que volvemos a la lista
  await expect(page.getByRole('button', { name: '+ Nuevo tipo' })).toBeVisible({ timeout: 10000 });

  // Restaurar
  await page.getByRole('button', { name: 'Editar' }).first().click();
  await page.getByRole('combobox').nth(1).selectOption(valorOriginal);
  await page.getByRole('button', { name: 'Guardar' }).click();
});

test('editar tipo con codigo vacio muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).clear();

  await page.getByRole('button', { name: 'Guardar' }).click();

  // Debe seguir en el formulario de edición
  await expect(page.getByRole('heading', { name: 'Editar Tipo de Misión' })).toBeVisible({ timeout: 5000 });
});

test('editar tipo con nombre vacio muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'Ej: Aeromédico' }).clear();

  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByRole('heading', { name: 'Editar Tipo de Misión' })).toBeVisible({ timeout: 5000 });
});

test('cancelar edicion de tipo no modifica datos', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).clear();
  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).fill('MODIFICADO');

  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByText('MODIFICADO')).not.toBeVisible({ timeout: 5000 });
});