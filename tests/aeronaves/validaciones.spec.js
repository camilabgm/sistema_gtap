import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Aeronaves' }).click();
});

test('matricula duplicada muestra error', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP0254');
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Test');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2000');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByPlaceholder('9', { exact: true }).fill('5');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');
  await page.getByRole('button', { name: 'Crear aeronave' }).click();
  await expect(page.getByText(/ya existe|duplicad/i)).toBeVisible({ timeout: 5000 });
});

test('matricula vacia no permite crear aeronave', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Test');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2000');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByPlaceholder('9', { exact: true }).fill('5');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');
  await page.getByRole('button', { name: 'Crear aeronave' }).click();
  await expect(page.getByText(/matrícula es obligatoria/i)).toBeVisible({ timeout: 5000 });
});

test('tipo modelo vacio no permite crear aeronave', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP7777');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Test');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2000');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByPlaceholder('9', { exact: true }).fill('5');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');
  await page.getByRole('button', { name: 'Crear aeronave' }).click();
  await expect(page.getByText(/tipo de aeronave es obligatorio/i)).toBeVisible({ timeout: 5000 });
});

test('estado no disponible sin motivo no permite crear', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP6666');
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Test');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2000');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByPlaceholder('9', { exact: true }).fill('5');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');
  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  await page.getByRole('button', { name: 'Crear aeronave' }).click();
  await expect(page.getByText(/motivo de no disponibilidad/i)).toBeVisible({ timeout: 5000 });
});

test('motivo otro sin descripcion no permite crear', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP5555');
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Test');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2000');
  await page.getByPlaceholder('1990').fill('1990');
  await page.getByPlaceholder('9', { exact: true }).fill('5');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');
  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  await page.locator('div:nth-child(13) > .w-full').selectOption('OTRO');
  await page.getByRole('button', { name: 'Crear aeronave' }).click();
  await expect(page.getByText(/describir el motivo/i)).toBeVisible({ timeout: 5000 });
});

test('cambiar a no disponible muestra selector de motivo', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();
  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');
  await expect(page.locator('div:nth-child(13) > .w-full')).toBeVisible({ timeout: 3000 });
  await page.getByRole('combobox').nth(5).selectOption('DISPONIBLE');
  await expect(page.locator('div:nth-child(13) > .w-full')).not.toBeVisible({ timeout: 3000 });
});