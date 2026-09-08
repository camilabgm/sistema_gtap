// tests/escala-manifiesto-post-vuelo/tests_flujo_completo_real.spec.js
//
// Versión que aprovecha el tiempo de espera: en vez de autorizar y
// quedarse esperando en el aire a que pase la hora de despegue, hace
// el Manifiesto en el medio — ese tiempo real (logins, navegación,
// llenar el formulario) cuenta como parte de la espera. Recién antes
// de entrar a Post-Vuelo se espera lo que efectivamente falte, si es
// que falta algo.

import { test, expect, esperarHoraDespegue } from "./tests_fixtures_escala"
import { loginComo, USUARIOS } from "../helpers/auth"

test("flujo real: manifiesto → tramos → cierre → combustible", async ({ page, escalaAutorizadaInmediata }) => {
  const escala = escalaAutorizadaInmediata

  // ── Supervisor de Semana carga el Manifiesto ─────────────────────
  await loginComo(page, USUARIOS.supervisorSemana.usuario, USUARIOS.supervisorSemana.password)
  await page.getByRole("link", { name: "Escalas", exact: true }).click()
  await page.getByRole("link", { name: "Gestión", exact: true }).click()

  await page.getByRole("row", { name: new RegExp(escala.solicitante) }).getByLabel("Manifiesto").click()

  await page.getByRole("button", { name: "+ Agregar persona" }).click()
  await page.getByRole("textbox", { name: "Nro. documento" }).fill("9999900")
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

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Cerrar manifiesto" }).click()
  await expect(page.getByText("Manifiesto cerrado", { exact: true })).toBeVisible()

  // ── Recién ahora esperamos lo que falte, si es que falta algo ────
  // Si el Manifiesto ya tardó más que la hora de despegue, esto no
  // espera nada — sigue directo.
  await esperarHoraDespegue(page, escala)

  // ── Piloto carga los tramos y cierra el Post-Vuelo ────────────────
  await loginComo(page, USUARIOS.piloto.usuario, USUARIOS.piloto.password)
  await page.getByRole("link", { name: "Escalas", exact: true }).click()
  await page.getByRole("link", { name: "Gestión", exact: true }).click()
  await page.getByRole("row", { name: new RegExp(escala.solicitante) }).getByLabel("Post-vuelo").click()

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Guardar tramo" }).first().click()
  await page.waitForTimeout(400)

  page.once("dialog", (dialog) => dialog.accept())
  await page.getByRole("button", { name: "Guardar tramo" }).nth(1).click()
  await page.waitForTimeout(400)

  await page.getByRole("button", { name: "Completar cierre del post-" }).click()
  await page.getByRole("textbox").nth(5).fill("SGAS → SGES → SGAS → SGES")
  await page.getByRole("button", { name: "Guardar post-vuelo" }).click()

  // El estado "Completada" aparece en MUCHOS lugares de esta pantalla
  // (la lista completa de la izquierda tiene sus propias escalas
  // "Completada" de antes) — hay que buscarlo solo dentro del panel
  // de detalle de nuestra escala, no en toda la página. Primero
  // esperamos a que el panel termine de refrescarse.
  const panelDetalle = page.locator("div").filter({ hasText: "Tu reporte de post-vuelo" }).filter({ hasText: escala.solicitante }).last()
  await expect(panelDetalle.getByText("Cargando post-vuelo…")).toHaveCount(0, { timeout: 10000 })
  await expect(panelDetalle.getByText("Completada")).toBeVisible()

  // ── Jefe de Combustible completa lo único que faltaba ─────────────
  await loginComo(page, USUARIOS.jefeCombustible.usuario, USUARIOS.jefeCombustible.password)
  await page.getByRole("link", { name: "Escalas", exact: true }).click()
  await page.getByRole("link", { name: "Gestión", exact: true }).click()
  await page.getByRole("row", { name: new RegExp(escala.solicitante) }).getByLabel("Post-vuelo").click()

  await page.getByPlaceholder("Litros").fill("40")
  await page.getByRole("button", { name: "Guardar" }).click()

  const panelDetalleCombustible = page.locator("div").filter({ hasText: "Tu reporte de post-vuelo" }).filter({ hasText: escala.solicitante }).last()
  await expect(panelDetalleCombustible.getByText("Combustible: 40 L")).toBeVisible()

  // ── Confirmación final: la auditoría tiene los pasos ──────────────
  await expect(panelDetalleCombustible.getByText(/Post-vuelo cargado por/)).toBeVisible()
})