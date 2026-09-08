// tests/manifiesto/permisos.spec.js
//
// Cada test crea su propia escala (nada de fixtures compartidos).

import { test, expect } from "../escala-manifiesto-post-vuelo/tests_fixtures_escala"
import { loginComo, USUARIOS } from "../helpers/auth"

test.describe("Manifiesto — quién puede gestionar", () => {
  test("un Piloto NO puede agregar pasajeros, aunque sea tripulante de esta escala", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    await expect(page.getByRole("button", { name: "+ Agregar persona" })).toHaveCount(0)
  })

  test("Supervisor de Semana SÍ puede, aunque no sea tripulante de esta escala", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    await expect(page.getByRole("button", { name: "+ Agregar persona" })).toBeVisible()
  })

  test("Jefe de Combustible, sin turno de Supervisor, no gestiona Manifiesto", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.jefeCombustible.usuario, USUARIOS.jefeCombustible.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    await expect(page.getByRole("button", { name: "+ Agregar persona" })).toHaveCount(0)
  })
})

test.describe("Manifiesto — carga y cierre", () => {
  test("agregar un pasajero y una carga, y marca la auditoría", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    await page.getByRole("button", { name: "+ Agregar persona" }).click()
    await page.getByRole("textbox", { name: "Nro. documento" }).fill("9999901")
    await page.getByRole("textbox", { name: "Nombre" }).fill("Juan")
    await page.getByRole("textbox", { name: "Apellido" }).fill("Perez")
    await page.getByRole("textbox", { name: "Nacionalidad" }).fill("Paraguayo")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Manifiesto · 1 persona")).toBeVisible()

    await page.getByRole("button", { name: "+ Agregar carga" }).click()
    await page.getByRole("textbox", { name: "Tipo (ej. equipaje," }).fill("equipaje de mano")
    await page.getByPlaceholder("Peso en kg").fill("3")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Carga · 1 ítem")).toBeVisible()

    await expect(page.getByText(/Manifiesto creado por/)).toBeVisible()
  })

  test("cerrar el manifiesto bloquea agregar más pasajeros", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Cerrar manifiesto" }).click()

    await expect(page.getByText("Manifiesto cerrado")).toBeVisible()
    await expect(page.getByRole("button", { name: "+ Agregar persona" })).toHaveCount(0)
  })
})

test.describe("Manifiesto — confirmar sin pasajeros / sin carga", () => {
  test("confirmar sin pasajeros muestra el estado confirmado", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Confirmar sin pasajeros" }).click()

    await expect(page.getByText("✓ Confirmado: esta escala no llevó pasajeros.")).toBeVisible()
  })

  test("agregar un pasajero real después revierte la confirmación sola", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Confirmar sin pasajeros" }).click()
    await expect(page.getByText("✓ Confirmado: esta escala no llevó pasajeros.")).toBeVisible()

    await page.getByRole("button", { name: "+ Agregar persona" }).click()
    await page.getByRole("textbox", { name: "Nro. documento" }).fill("9999902")
    await page.getByRole("textbox", { name: "Nombre" }).fill("Corrección")
    await page.getByRole("textbox", { name: "Apellido" }).fill("Automática")
    await page.getByRole("textbox", { name: "Nacionalidad" }).fill("Paraguayo")
    await page.getByRole("button", { name: "Guardar" }).click()

    await expect(page.getByText("✓ Confirmado: esta escala no llevó pasajeros.")).toHaveCount(0)
  })
})

test.describe("Manifiesto — eliminar completo", () => {
  test("solo Comandante ve 'Eliminar manifiesto'", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.jefeOperaciones.usuario, USUARIOS.jefeOperaciones.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    await expect(page.getByRole("button", { name: "Eliminar manifiesto" })).toHaveCount(0)
  })

  test("Comandante elimina el manifiesto completo y resetea la auditoría", async ({ page, escalaAutorizada }) => {
    // Primero, como Supervisor, cargamos algo para tener qué eliminar
    await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()
    await page.getByRole("button", { name: "+ Agregar persona" }).click()
    await page.getByRole("textbox", { name: "Nro. documento" }).fill("9999903")
    await page.getByRole("textbox", { name: "Nombre" }).fill("Para")
    await page.getByRole("textbox", { name: "Apellido" }).fill("Eliminar")
    await page.getByRole("textbox", { name: "Nacionalidad" }).fill("Paraguayo")
    await page.getByRole("button", { name: "Guardar" }).click()
    await expect(page.getByText("Manifiesto · 1 persona")).toBeVisible()

    // Ahora sí, como Comandante, lo eliminamos
    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()
    await page
      .getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
      .getByLabel("Manifiesto")
      .click()

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Eliminar manifiesto" }).click()

    await expect(page.getByText("Manifiesto · 0 personas")).toBeVisible()
    await expect(page.getByText(/Manifiesto creado por/)).toHaveCount(0)
  })
})