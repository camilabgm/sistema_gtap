// tests/escala-manifiesto-post-vuelo/tests_fixtures_escala.js
//
// Cada test crea su propia escala, fresca, con "escalaCompleta" (sin
// autorizar) o "escalaAutorizada" (autorizada, hora de despegue ya
// pasada). Antes había una versión "compartida" entre varios tests
// para ahorrar tiempo — se sacó porque generaba tests compitiendo por
// los mismos tripulantes (Samudio/Delgado) al mismo tiempo, más lío
// del que ahorraba.

import { test as base, expect } from "@playwright/test"
import { loginComo, USUARIOS } from "../helpers/auth"

function solicitanteUnico() {
  return `Playwright-${Date.now()}`
}

async function esperarOpcionesReales(combobox, minimoOpciones = 2, timeout = 15000) {
  await expect
    .poll(async () => await combobox.locator("option").count(), {
      timeout,
      message: "El combobox nunca cargó opciones reales — sigue solo con el placeholder",
    })
    .toBeGreaterThanOrEqual(minimoOpciones)
}

async function seleccionarPorTexto(combobox, textoParcial) {
  const opciones = await combobox.locator("option").allTextContents()
  const indice = opciones.findIndex((texto) => texto.includes(textoParcial))
  if (indice === -1) {
    throw new Error(
      `No se encontró ninguna opción que contenga "${textoParcial}" — opciones disponibles: ${opciones.join(", ")}`
    )
  }
  await combobox.selectOption({ index: indice })
}

function fechaHoraLocal(base, minutosDesdeBase) {
  const fecha = new Date(base.getTime() + minutosDesdeBase * 60000)
  const pad = (n) => String(n).padStart(2, "0")
  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}T${pad(fecha.getHours())}:${pad(fecha.getMinutes())}`
}

// ── Lógica de creación, ahora como función independiente ──────────
// para poder llamarla tanto desde el fixture normal (con la "page"
// del test) como desde el fixture de worker (con una "page" propia,
// armada a mano porque a nivel worker no existe la "page" del test).
async function crearEscalaCompleta(page) {
  await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)

  const solicitante = solicitanteUnico()
  const horaDespegue = new Date(Date.now() + 20 * 60000) // +20 min

  await page.goto("http://localhost:3000/dashboard/escalas/nueva")
  await page.getByRole("textbox", { name: "Ej: FFMM, Presidencia, ANDE..." }).fill(solicitante)
  await page.locator('input[type="date"]').fill(fechaHoraLocal(horaDespegue, 0).slice(0, 10))
  await page.getByRole("combobox").first().selectOption("VERBAL")
  await page.getByRole("button", { name: "Guardar solicitud" }).click()

  const confirmacion = page.getByText(/Solicitud guardada \(escala #\d+\)/)
  await confirmacion.waitFor()
  const textoConfirmacion = await confirmacion.textContent()
  const match = textoConfirmacion.match(/escala #(\d+)/)
  const escalaId = match ? Number(match[1]) : null
  if (!escalaId) {
    throw new Error("No se pudo extraer el id del mensaje de confirmación — revisar si el texto cambió")
  }

  await page.getByRole("textbox", { name: "Se puede completar después si" }).fill(`GTAP-TEST-${Date.now()}`)
  await page.getByRole("combobox").nth(1).selectOption("6")

  await page.getByRole("textbox", { name: "SGAS" }).fill("sgas")
  await page.getByRole("textbox", { name: "SGES" }).fill("sges")

  const salidaTramo1 = page.locator('input[type="datetime-local"]').nth(0)
  const llegadaTramo1 = page.locator('input[type="datetime-local"]').nth(1)
  await salidaTramo1.click()
  await salidaTramo1.fill(fechaHoraLocal(horaDespegue, 0))
  await llegadaTramo1.click()
  await llegadaTramo1.fill(fechaHoraLocal(horaDespegue, 12))
  await expect(salidaTramo1).toHaveValue(fechaHoraLocal(horaDespegue, 0))
  await expect(llegadaTramo1).toHaveValue(fechaHoraLocal(horaDespegue, 12))

  await page.getByRole("button", { name: "+ Agregar tramo" }).click()
  await page.getByRole("textbox", { name: "SGAS" }).nth(1).fill("sgas")
  await page.getByRole("textbox", { name: "SGES" }).nth(1).fill("sges")

  const salidaTramo2 = page.locator('input[type="datetime-local"]').nth(2)
  const llegadaTramo2 = page.locator('input[type="datetime-local"]').nth(3)
  await salidaTramo2.click()
  await salidaTramo2.fill(fechaHoraLocal(horaDespegue, 27))
  await llegadaTramo2.click()
  await llegadaTramo2.fill(fechaHoraLocal(horaDespegue, 39))
  await expect(salidaTramo2).toHaveValue(fechaHoraLocal(horaDespegue, 27))
  await expect(llegadaTramo2).toHaveValue(fechaHoraLocal(horaDespegue, 39))

  await expect(page.getByText("Completá la hora de salida y llegada del itinerario para ver disponibilidad.")).toHaveCount(0)

  const comboAeronave = page.getByRole("combobox").nth(2)
  await esperarOpcionesReales(comboAeronave)
  await comboAeronave.selectOption({ index: 1 })
  await expect(comboAeronave).not.toHaveValue("")

  await page.getByRole("button", { name: "+ Agregar tripulante" }).click()
  await page.locator("div:nth-child(2) > .w-44 > .w-full").selectOption("COPILOTO")
  // Samudio (USUARIOS.piloto) a propósito — los tests después se
  // loguean como él para Post-Vuelo, y Post-Vuelo solo lo dejan tocar
  // a los tripulantes REALES de la escala.
  const comboTripulante1 = page.getByRole("combobox").nth(3)
  await esperarOpcionesReales(comboTripulante1)
  await seleccionarPorTexto(comboTripulante1, "Samudio")

  await page.getByRole("button", { name: "+ Agregar tripulante" }).click()
  await page.locator("div:nth-child(3) > .w-44 > .w-full").selectOption("TECNICO_DE_VUELO")
  const comboTripulante2 = page.locator("div:nth-child(3) > .flex-1 > .w-full")
  await esperarOpcionesReales(comboTripulante2)
  await seleccionarPorTexto(comboTripulante2, "Delgado")

  await page.getByRole("button", { name: "Guardar y publicar" }).click()
  await page.waitForTimeout(4000)
  await expect(page.getByText(/publicada|guardada|autorizada/i).first()).toBeVisible({ timeout: 5000 })

  return { id: escalaId, solicitante, horaDespegue }
}

async function autorizarEscala(page, escala) {
  await loginComo(page, USUARIOS.comandante.usuario, USUARIOS.comandante.password)
  await page.getByRole("link", { name: "Escalas" }).click()
  await page.getByRole("link", { name: "Pendientes de autorizar" }).click()

  const tarjeta = page
    .locator("div")
    .filter({ hasText: escala.solicitante })
    .filter({ has: page.getByRole("button", { name: "Autorizar" }) })
    .last()

  await tarjeta.getByRole("button", { name: "Autorizar" }).click()
  await expect(page.getByText(/autorizada/i)).toBeVisible()
}

export async function esperarHoraDespegue(page, escala) {
  const msRestantes = escala.horaDespegue.getTime() - Date.now()
  if (msRestantes > 0) {
    await page.waitForTimeout(msRestantes + 2000)
  }
}

export const test = base.extend({
  escalaCompleta: async ({ page }, use, testInfo) => {
    testInfo.setTimeout(25 * 60000)
    const escala = await crearEscalaCompleta(page)
    await use(escala)
    await page.request.delete(`http://localhost:3000/api/escalas/${escala.id}`).catch(() => {})
  },

  escalaAutorizadaInmediata: async ({ page, escalaCompleta }, use, testInfo) => {
    testInfo.setTimeout(25 * 60000)
    await autorizarEscala(page, escalaCompleta)
    await use(escalaCompleta)
  },

  escalaAutorizada: async ({ page, escalaAutorizadaInmediata }, use, testInfo) => {
    testInfo.setTimeout(25 * 60000)
    await esperarHoraDespegue(page, escalaAutorizadaInmediata)
    await use(escalaAutorizadaInmediata)
  },
})

export { expect }