import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Tipos de Misiones' }).click();
});

test('pagina tipos de misiones carga y muestra boton nuevo tipo', async ({ page }) => {
  await expect(page).toHaveURL(/tipos-misiones/);
  await expect(page.getByRole('button', { name: '+ Nuevo tipo' })).toBeVisible();
});

test('catalogo muestra las tres clasificaciones', async ({ page }) => {
  await expect(page.getByRole('cell', { name: 'Operacional' }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('cell', { name: 'Tipo de Vuelo' }).first()).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole('cell', { name: 'Logística' }).first()).toBeVisible({ timeout: 5000 });
});

test('crear tipo de mision nuevo', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();

  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).fill('ZZZ');
  await page.getByRole('textbox', { name: 'Ej: Aeromédico' }).fill('Tipo de prueba');
  await page.getByRole('combobox').nth(1).selectOption('TIPO_VUELO');

  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('ZZZ').first()).toBeVisible({ timeout: 10000 });
});

test('crear tipo de mision con subtipos', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();

  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).fill('YYY');
  await page.getByRole('textbox', { name: 'Ej: Aeromédico' }).fill('Tipo con subtipos');
  await page.getByRole('combobox').nth(1).selectOption('TIPO_VUELO');

  await page.getByRole('checkbox', { name: '¿Este tipo de vuelo tiene sub' }).check();
  await page.getByRole('textbox', { name: 'Ej: Traslado de paciente,' }).fill('Sub1, Sub2, Sub3');

  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.getByText('YYY').first()).toBeVisible({ timeout: 10000 });
});

test('checkbox subtipos muestra y oculta campo de subtipos', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();

  await page.getByRole('combobox').nth(1).selectOption('TIPO_VUELO');

  const checkbox = page.getByRole('checkbox', { name: '¿Este tipo de vuelo tiene sub' });
  const campoSubtipos = page.getByRole('textbox', { name: 'Ej: Traslado de paciente,' });

  await expect(campoSubtipos).not.toBeVisible();

  await checkbox.check();
  await expect(campoSubtipos).toBeVisible();

  await checkbox.uncheck();
  await expect(campoSubtipos).not.toBeVisible();
});

test('buscar tipo de mision filtra resultados', async ({ page }) => {
  const buscador = page.getByRole('textbox', { name: 'Buscar por código o nombre...' });
  await buscador.fill('VMIL');
  await expect(page.getByText('VMIL').first()).toBeVisible({ timeout: 5000 });
});

test('buscar tipo inexistente muestra lista vacia', async ({ page }) => {
  const buscador = page.getByRole('textbox', { name: 'Buscar por código o nombre...' });
  await buscador.fill('XYZXYZ');
  await page.waitForTimeout(1000);
  await expect(page.getByText('XYZXYZ')).not.toBeVisible();
});

test('codigo vacio no permite crear tipo', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();
  await page.getByRole('textbox', { name: 'Ej: Aeromédico' }).fill('Sin código');
  await page.getByRole('combobox').nth(1).selectOption('TIPO_VUELO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible({ timeout: 5000 });
});

test('nombre vacio no permite crear tipo', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();
  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).fill('XXX');
  await page.getByRole('combobox').nth(1).selectOption('TIPO_VUELO');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible({ timeout: 5000 });
});

test('codigo duplicado no permite crear tipo', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nuevo tipo' }).click();
  await page.getByRole('textbox', { name: 'Ej: AME, VMIL, FAP' }).fill('VMIL');
  await page.getByRole('textbox', { name: 'Ej: Aeromédico' }).fill('Duplicado');
  await page.getByRole('combobox').nth(1).selectOption('OPERACIONAL');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText(/duplicad|ya existe|registrad/i)).toBeVisible({ timeout: 5000 });
});