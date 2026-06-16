import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Aeronaves' }).click();
});

test('editar aeronave abre formulario con datos cargados', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible({ timeout: 5000 });

  // La matrícula debe tener datos
  const matricula = await page.getByRole('textbox', { name: 'FAP0254' }).inputValue();
  expect(matricula.length).toBeGreaterThan(0);
});

test('editar aeronave y guardar cambios', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Aceptar el diálogo de confirmación cuando cambie a NO DISPONIBLE
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  await page.locator('div:nth-child(13) > .w-full').selectOption('EN_MANTENIMIENTO');

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  // Esperar a que volvamos a la lista
  await expect(page.getByRole('button', { name: '+ Nueva aeronave' })).toBeVisible({ timeout: 15000 });

  // Restaurar: volver a DISPONIBLE (no hay diálogo para este cambio)
  await page.getByRole('button', { name: 'Editar' }).first().click();
  await page.getByRole('combobox').nth(5).selectOption('DISPONIBLE');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('button', { name: '+ Nueva aeronave' })).toBeVisible({ timeout: 15000 });
});

test('editar aeronave NO DISPONIBLE sin motivo muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  // Aceptar el diálogo de confirmación
  page.once('dialog', async dialog => {
    await dialog.accept();
  });

  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  // No seleccionar motivo

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  // El formulario debe seguir abierto (la validación rechazó el guardado)
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeVisible({ timeout: 5000 });
});

test('editar aeronave con matricula vacia muestra error', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'FAP0254' }).clear();

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.getByText(/matrícula es obligatoria/i)).toBeVisible({ timeout: 5000 });
});

test('cancelar edicion de aeronave no modifica datos', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar' }).first().click();

  await page.getByRole('textbox', { name: 'FAP0254' }).clear();
  await page.getByRole('textbox', { name: 'FAP0254' }).fill('MODIFICADO');

  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByText('MODIFICADO')).not.toBeVisible({ timeout: 5000 });
});