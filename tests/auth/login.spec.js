import { test, expect } from '@playwright/test';

// ============================================
// TEST 1: Login exitoso
// ============================================
test('login exitoso con usuario Comandante', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await expect(page.getByText('Buenas')).toBeVisible();
});

// ============================================
// TEST 2: Login con contraseña incorrecta
// ============================================
test('login fallido muestra mensaje de error', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('ContraseñaIncorrecta123');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/login/);
});

// ============================================
// TEST 3: Login con usuario inexistente
// ============================================
test('login con usuario inexistente muestra error', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('9999999');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('CualquierCosa123');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/login/);
});

// ============================================
// TEST 4: Campos vacíos no permiten login
// ============================================
test('login con campos vacios no permite acceder', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await expect(page).toHaveURL(/login/);
});

// ============================================
// TEST 5: Solo contraseña vacía
// ============================================
test('login sin contraseña no permite acceder', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su usuario' }).fill('1234');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await expect(page).toHaveURL(/login/);
});

// ============================================
// TEST 6: Solo usuario vacío
// ============================================
test('login sin usuario no permite acceder', async ({ page }) => {
  await page.goto('http://localhost:3000/login');

  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).fill('Gtap2026!!');
  await page.getByRole('textbox', { name: 'Ingrese su contraseña' }).press('Enter');

  await expect(page).toHaveURL(/login/);
});