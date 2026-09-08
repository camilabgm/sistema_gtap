// tests/post-vuelo/combustible-y-eliminar.spec.js

import { test, expect } from "../escala-manifiesto-post-vuelo/tests_fixtures_escala"
import { loginComo, USUARIOS } from "../helpers/auth"

// Confirmado con tu grabación: se entra por Gestión de Escalas y se
// usa el ícono de Post-vuelo en la fila — mismo patrón que Manifiesto.
async function abrirPostVueloDesdeGestion(page, solicitante) {
  await page.getByRole("link", { name: "Escalas", exact: true }).click()
  await page.getByRole("link", { name: "Gestión", exact: true }).click()
  await page
    .getByRole("row", { name: new RegExp(solicitante) })
    .getByLabel("Post-vuelo")
    .click()
}

async function crearYCerrarPostVuelo(page, solicitante) {
  await abrirPostVueloDesdeGestion(page, solicitante)

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Guardar tramo" }).first().click()
  await page.waitForTimeout(400)
  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Guardar tramo" }).nth(1).click()
  await page.waitForTimeout(400)

  await page.getByRole("button", { name: "Completar cierre del post-" }).click()
  await page.getByRole("textbox").nth(5).fill("SGAS → SGES → SGAS → SGES")
  await page.getByRole("button", { name: "Guardar post-vuelo" }).click()
}

test.describe("Post-Vuelo — combustible, una sola vez para Combustible/Supervisor", () => {
  test("Jefe de Combustible carga una vez, y la segunda vez el bloque ya no aparece", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await crearYCerrarPostVuelo(page, escalaAutorizada.solicitante)

    await loginComo(page, USUARIOS.jefeCombustible.usuario, USUARIOS.jefeCombustible.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    await page.getByPlaceholder("Litros").fill("180")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Combustible: 180 L")).toBeVisible()

    await page.reload()
    await expect(page.getByPlaceholder("Litros")).toHaveCount(0)
  })

  test("Comandante corrige el combustible sin límite de veces", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await crearYCerrarPostVuelo(page, escalaAutorizada.solicitante)

    await loginComo(page, USUARIOS.jefeCombustible.usuario, USUARIOS.jefeCombustible.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)
    await page.getByPlaceholder("Litros").fill("180")
    await page.getByRole("button", { name: "Guardar" }).click()

    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    await expect(page.getByText(/Corregir combustible/)).toBeVisible()
    await page.getByPlaceholder(/Actual: 180/).fill("175")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Combustible: 175 L")).toBeVisible()

    await page.getByPlaceholder(/Actual: 175/).fill("178")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Combustible: 178 L")).toBeVisible()
  })
})

test.describe("Post-Vuelo — eliminar completo", () => {
  test("solo Comandante ve 'Eliminar post-vuelo'", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await crearYCerrarPostVuelo(page, escalaAutorizada.solicitante)

    await loginComo(page, USUARIOS.jefeOperaciones.usuario, USUARIOS.jefeOperaciones.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    await expect(page.getByRole("button", { name: "Eliminar post-vuelo" })).toHaveCount(0)
  })

  test("Comandante elimina el post-vuelo y la escala vuelve a 'Por reportar'", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await crearYCerrarPostVuelo(page, escalaAutorizada.solicitante)

    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Eliminar post-vuelo" }).click()

    await expect(page.getByText("Por reportar")).toBeVisible()
  })
})