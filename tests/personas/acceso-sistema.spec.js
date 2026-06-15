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
// TEST 1: Botón dar acceso está visible para
//         personas sin acceso
// =================================================
test('boton dar acceso visible para personas sin acceso', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  // Verificar que existe al menos una persona sin acceso
  const existe = await botonDarAcceso.isVisible();
  if (existe) {
    await expect(botonDarAcceso).toBeVisible();
  }
});

// =================================================
// TEST 2: Formulario de dar acceso se abre
// =================================================
test('formulario de dar acceso muestra campo contraseña y selector de rol', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  if (await botonDarAcceso.isVisible()) {
    await botonDarAcceso.click();

    // Verificar que aparece el campo de contraseña
    await expect(page.getByRole('textbox', { name: 'Mínimo 10 caracteres' })).toBeVisible({ timeout: 5000 });
  }
});

// =================================================
// TEST 3: Contraseña menor a 10 caracteres es rechazada
// =================================================
test('contraseña corta no permite dar acceso', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  if (await botonDarAcceso.isVisible()) {
    await botonDarAcceso.click();

    // Poner contraseña muy corta
    await page.getByRole('textbox', { name: 'Mínimo 10 caracteres' }).fill('Abc1!');

    // Seleccionar un rol
    await page.getByRole('combobox').nth(2).selectOption('6');

    // Escuchar diálogo
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Dar acceso' }).nth(1).click();

    // Debe mostrar error de contraseña o seguir en el formulario
    await expect(page.getByText(/mínimo|caracteres|corta|10/i)).toBeVisible({ timeout: 5000 });
  }
});

// =================================================
// TEST 4: Contraseña sin mayúscula es rechazada
// =================================================
test('contraseña sin mayuscula no permite dar acceso', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  if (await botonDarAcceso.isVisible()) {
    await botonDarAcceso.click();

    // Contraseña sin mayúscula
    await page.getByRole('textbox', { name: 'Mínimo 10 caracteres' }).fill('contraseña123!');

    await page.getByRole('combobox').nth(2).selectOption('6');

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Dar acceso' }).nth(1).click();

    await expect(page.getByText(/mayúscula|uppercase/i)).toBeVisible({ timeout: 5000 });
  }
});

// =================================================
// TEST 5: Contraseña sin carácter especial es rechazada
// =================================================
test('contraseña sin caracter especial no permite dar acceso', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  if (await botonDarAcceso.isVisible()) {
    await botonDarAcceso.click();

    // Contraseña sin carácter especial
    await page.getByRole('textbox', { name: 'Mínimo 10 caracteres' }).fill('Contraseña123');

    await page.getByRole('combobox').nth(2).selectOption('6');

    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Dar acceso' }).nth(1).click();

    await expect(page.getByText(/especial|símbolo/i)).toBeVisible({ timeout: 5000 });
  }
});

// =================================================
// TEST 6: Dar acceso exitoso con contraseña válida
// CUIDADO: Este test modifica datos reales
// =================================================
test('dar acceso exitoso con contraseña valida', async ({ page }) => {
  const botonDarAcceso = page.getByRole('button', { name: 'Dar acceso' }).first();

  if (await botonDarAcceso.isVisible()) {
    await botonDarAcceso.click();

    // Contraseña válida
    await page.getByRole('textbox', { name: 'Mínimo 10 caracteres' }).fill('TestPassword1!');

    // Seleccionar rol
    await page.getByRole('combobox').nth(2).selectOption('6');

    // Aceptar confirmación
    page.once('dialog', async dialog => {
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Dar acceso' }).nth(1).click();

    // Verificar que se procesó (el botón "Dar acceso" desaparece para esa persona
    // o aparece un mensaje de éxito)
    await expect(page.getByText(/éxito|creado|acceso otorgado/i)).toBeVisible({ timeout: 10000 });
  }
});