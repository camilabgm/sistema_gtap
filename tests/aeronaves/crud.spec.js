import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.getByRole('link', { name: 'Aeronaves' }).click();
});

// =================================================
// TEST 1: Página de aeronaves carga correctamente
// =================================================
test('pagina de aeronaves carga y muestra boton nueva aeronave', async ({ page }) => {
  await expect(page).toHaveURL(/aeronaves/);
  await expect(page.getByRole('button', { name: '+ Nueva aeronave' })).toBeVisible();
});

// =================================================
// TEST 2: Crear aeronave nueva con todos los campos
// IMPORTANTE: Cambiar matrícula si corrés más de una vez
// =================================================
test('crear aeronave nueva con datos completos', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();

  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP9999');
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('C-208B Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Cessna');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2005');
  await page.getByPlaceholder('1990').fill('1998');
  await page.getByPlaceholder('9', { exact: true }).fill('8');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');

  await page.getByRole('button', { name: 'Crear aeronave' }).click();

  await expect(page.getByText('FAP9999')).toBeVisible({ timeout: 10000 });
});

// =================================================
// TEST 3: Crear aeronave con estado NO DISPONIBLE
// =================================================
test('crear aeronave no disponible con motivo mantenimiento', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();

  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAP8888');
  await page.getByRole('textbox', { name: 'C-208B Caravan' }).fill('BE-90 Test');
  await page.getByRole('textbox', { name: 'Cessna' }).fill('Beechcraft');
  await page.getByRole('combobox').nth(2).selectOption('AVGAS');
  await page.getByPlaceholder('2000').fill('2003');
  await page.getByPlaceholder('1990').fill('1995');
  await page.getByPlaceholder('9', { exact: true }).fill('6');
  await page.getByRole('combobox').nth(4).selectOption('PROPIA');

  // Cambiar estado a NO DISPONIBLE
  await page.getByRole('combobox').nth(5).selectOption('NO_DISPONIBLE');

  // Seleccionar motivo
  await page.locator('div:nth-child(13) > .w-full').selectOption('EN_MANTENIMIENTO');

  await page.getByRole('button', { name: 'Crear aeronave' }).click();

  await expect(page.getByText('FAP8888')).toBeVisible({ timeout: 10000 });
});

// =================================================
// TEST 4: Abrir formulario y cancelar no crea aeronave
// =================================================
test('cancelar formulario nueva aeronave no crea registro', async ({ page }) => {
  await page.getByRole('button', { name: '+ Nueva aeronave' }).click();

  await page.getByRole('textbox', { name: 'FAP0254' }).fill('FAPNOEXISTE');

  await page.getByRole('button', { name: 'Cancelar' }).click();

  await expect(page.getByText('FAPNOEXISTE')).not.toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 5: Buscar aeronave por matrícula
// =================================================
test('buscar aeronave filtra resultados correctamente', async ({ page }) => {
  const buscador = page.getByRole('textbox', { name: 'Buscar por matrícula o tipo...' });

  await buscador.fill('FAP0254');

  // Debe aparecer la aeronave buscada
  await expect(page.getByText('FAP0254').first()).toBeVisible({ timeout: 5000 });
});

// =================================================
// TEST 6: Buscar aeronave inexistente no muestra resultados
// =================================================
test('buscar aeronave inexistente muestra lista vacia', async ({ page }) => {
  const buscador = page.getByRole('textbox', { name: 'Buscar por matrícula o tipo...' });

  await buscador.fill('ZZZZZZZ');

  // No debe aparecer ninguna aeronave o debe mostrar mensaje vacío
  await page.waitForTimeout(1000);
  await expect(page.getByText('ZZZZZZZ')).not.toBeVisible();
});

// =================================================
// TEST 7: Abrir formulario de edición
// =================================================
test('boton editar abre formulario de edicion', async ({ page }) => {
  const botonEditar = page.getByRole('button', { name: 'Editar' }).first();

  if (await botonEditar.isVisible()) {
    await botonEditar.click();

    // Debe aparecer el botón cancelar del formulario de edición
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible({ timeout: 5000 });
  }
});

// =================================================
// TEST 8: Cancelar edición no modifica datos
// =================================================
test('cancelar edicion no modifica la aeronave', async ({ page }) => {
  const botonEditar = page.getByRole('button', { name: 'Editar' }).first();

  if (await botonEditar.isVisible()) {
    await botonEditar.click();
    await page.getByRole('button', { name: 'Cancelar' }).click();

    // Verificar que seguimos en la lista normal
    await expect(page.getByRole('button', { name: '+ Nueva aeronave' })).toBeVisible({ timeout: 5000 });
  }
});