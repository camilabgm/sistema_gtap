// tests/post-vuelo/tramos-y-cierre.spec.js

import { test, expect } from "../escala-manifiesto-post-vuelo/tests_fixtures_escala"
import { loginComo, USUARIOS } from "../helpers/auth"

// Confirmado con tu grabación: se entra por Gestión de Escalas y se
// usa el ícono de Post-vuelo en la fila — mismo patrón que ya usamos
// para Manifiesto. Más confiable que buscar en la propia lista de
// Post-Vuelo, cuyo texto de fila no habíamos verificado.
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

test.describe("Post-Vuelo — tramos antes del cierre", () => {
  test("un tripulante puede guardar el mismo tramo varias veces sin límite", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    for (let intento = 0; intento < 2; intento++) {
      page.once("dialog", (dialog) => dialog.accept())
      await page.getByRole("button", { name: "Guardar tramo" }).first().click()
      await page.waitForTimeout(400)
    }

    // Si el botón sigue visible después de guardar dos veces, no hay
    // candado de "una sola vez" en los tramos — como se decidió.
    await expect(page.getByRole("button", { name: "Guardar tramo" }).first()).toBeVisible()
  })

  test("una vez creado el post-vuelo, el tripulante ya no puede tocar los tramos", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Guardar tramo" }).first().click()
    await page.waitForTimeout(400)
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Guardar tramo" }).nth(1).click()
    await page.waitForTimeout(400)

    await page.getByRole("button", { name: "Completar cierre del post-" }).click()
    await page.getByRole("textbox").nth(5).fill("SGAS → SGES → SGAS → SGES")
    await page.getByRole("button", { name: "Guardar post-vuelo" }).click()
    await expect(page.getByText("Completada")).toBeVisible()

    // Ahora sí, con el post-vuelo ya creado, el botón de guardar tramo
    // tiene que haber desaparecido para el tripulante
    await expect(page.getByRole("button", { name: "Guardar tramo" })).toHaveCount(0)
  })
})

test.describe("Post-Vuelo — sugerencia desde Manifiesto", () => {
  test("al completar el cierre, Pasajeros/Carga vienen sugeridos si el Manifiesto ya tiene datos", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión" }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()
    await page.getByRole("button", { name: "+ Agregar persona" }).click()
    await page.getByRole("textbox", { name: "Nro. documento" }).fill("9999904")
    await page.getByRole("textbox", { name: "Nombre" }).fill("Sugerencia")
    await page.getByRole("textbox", { name: "Apellido" }).fill("Test")
    await page.getByRole("textbox", { name: "Nacionalidad" }).fill("Paraguayo")
    await page.getByRole("button", { name: "Guardar" }).click()

    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Guardar tramo" }).first().click()
    await page.waitForTimeout(400)
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Guardar tramo" }).nth(1).click()
    await page.waitForTimeout(400)

    await page.getByRole("button", { name: "Completar cierre del post-" }).click()

    await expect(page.getByText("(según Manifiesto)").first()).toBeVisible()
  })
})

test.describe("Post-Vuelo — acceso general restringido a la matriz", () => {
  test("Comandante del Escuadrón de Mantenimiento NO puede editar el cierre general", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await crearYCerrarPostVuelo(page, escalaAutorizada.solicitante)

    await loginComo(page, USUARIOS.cmdteEscMantenimiento.usuario, USUARIOS.cmdteEscMantenimiento.password)
    await abrirPostVueloDesdeGestion(page, escalaAutorizada.solicitante)

    await expect(page.getByRole("button", { name: "Editar datos del Post-Vuelo" })).toHaveCount(0)
  })
})