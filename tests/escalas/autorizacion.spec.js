// tests/escalas/autorizacion.spec.js
//
// Cada test crea su propia escala (nada de fixtures compartidos —
// generaban competencia entre tests por los mismos tripulantes).

import { test, expect } from "../escala-manifiesto-post-vuelo/tests_fixtures_escala"
import { loginComo, USUARIOS } from "../helpers/auth"

test.describe("Escalas — autorizar", () => {
  test("Comandante autoriza y la escala pasa a Autorizada", async ({ page, escalaCompleta }) => {
    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Pendientes de autorizar" }).click()

    // Autorizar DENTRO de la fila de nuestra escala puntual — si
    // clickeáramos el primer "Autorizar" de la lista a secas, con
    // varias escalas pendientes a la vez correríamos el riesgo de
    // autorizar una que no es la nuestra.
    await page
      .getByRole("row", { name: new RegExp(escalaCompleta.solicitante) })
      .getByRole("button", { name: "Autorizar" })
      .click()

    await expect(page.getByText(/autorizada/i)).toBeVisible()
  })

  test("Jefe de Operaciones tiene cargo en la cascada, pero no puede autorizar mientras Comandante esté disponible", async ({ page, escalaCompleta }) => {
    await loginComo(page, USUARIOS.jefeOperaciones.usuario, USUARIOS.jefeOperaciones.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Pendientes de autorizar" }).click()

    // Jorge sí tiene acceso a esta pantalla (por eso llega hasta acá),
    // pero como Comandante es el autorizante activo, el botón puntual
    // de nuestra escala no tiene que estar disponible para él.
    const fila = page.getByRole("row", { name: new RegExp(escalaCompleta.solicitante) })
    await expect(fila.getByRole("button", { name: "Autorizar" })).toHaveCount(0)
  })
})

test.describe("Escalas — edición restringida por estado", () => {
  test("una escala recién creada (Programada) SÍ se puede editar", async ({ page, escalaCompleta }) => {
    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()

    const fila = page.getByRole("row", { name: new RegExp(escalaCompleta.solicitante) })
    await expect(fila.getByRole("button", { name: "Editar" })).toBeEnabled()
  })

  test("solo Comandante ve el ícono de Eliminar en Gestión de Escalas", async ({ page, escalaCompleta }) => {
    await loginComo(page, USUARIOS.jefeOperaciones.usuario, USUARIOS.jefeOperaciones.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()

    const fila = page.getByRole("row", { name: new RegExp(escalaCompleta.solicitante) })
    await expect(fila.getByRole("button", { name: "Eliminar" })).toHaveCount(0)
  })
})

test.describe("Escalas — Abortar", () => {
  test("abortar una escala programada pide motivo y lo guarda", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()

    const fila = page.getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
    await fila.getByRole("button", { name: "Abortar escala" }).click()

    // Se abre el popover con el select de motivos — el primer motivo
    // real, no el placeholder vacío
    await page.getByRole("combobox").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Confirmar aborto" }).click()

    await expect(fila.getByText("Abortada")).toBeVisible()
  })

  test("después de abortada, ni Manifiesto ni Post-Vuelo están disponibles", async ({ page, escalaAutorizada }) => {
    await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
    await page.getByRole("link", { name: "Escalas", exact: true }).click()
    await page.getByRole("link", { name: "Gestión", exact: true }).click()

    const fila = page.getByRole("row", { name: new RegExp(escalaAutorizada.solicitante) })
    await fila.getByRole("button", { name: "Abortar escala" }).click()
    await page.getByRole("combobox").selectOption({ index: 1 })
    await page.getByRole("button", { name: "Confirmar aborto" }).click()
    await expect(fila.getByText("Abortada")).toBeVisible()

    await expect(fila.getByRole("button", { name: "Manifiesto" })).toBeDisabled()
    await expect(fila.getByRole("button", { name: "Post-vuelo" })).toBeDisabled()
  })
})