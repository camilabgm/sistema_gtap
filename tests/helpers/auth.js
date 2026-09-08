// tests/helpers/auth.js
//
// Reemplaza al helper anterior — este ya está calcado de tu
// login.spec.js real, no de una estimación mía.

import { expect } from "@playwright/test"

export async function loginComo(page, usuario, password) {
  await page.goto("http://localhost:3000/login")
  await page.getByRole("textbox", { name: "Ingrese su usuario" }).fill(usuario)
  await page.getByRole("textbox", { name: "Ingrese su contraseña" }).fill(password)
  await page.getByRole("textbox", { name: "Ingrese su contraseña" }).press("Enter")
  await page.waitForURL("**/dashboard", { timeout: 15000 })
}

export async function cerrarSesion(page) {
  await page.getByRole("button", { name: /cerrar sesión|salir/i }).click()
  await page.waitForURL("**/login", { timeout: 15000 })
}

export const USUARIOS = {
  comandante:               { usuario: "1231234", password: "CesarFlor1!" }, // Flor, César
  jefeOperaciones:           { usuario: "12345", password: "Jorge2026!!" }, // Gómez, Jorge
  cmdteEscAereo:              { usuario: "123456", password: "eduardoGon12!!" }, // González, Eduardo
  jefeProgramacionControl:    { usuario: "55001001", password: "Gtap2026!!" }, // Rojas, Luis
  cmdteEscMantenimiento:      { usuario: "123123", password: "Alberto1!!!" }, // Aquino, Alberto
  jefeCombustible:            { usuario: "9000002", password: "RodrigoBritez1!!" }, // Britez, Rodrigo (sin rol secundario)
  supervisorSemana:           { usuario: "9000001", password: "CandidoInsfran1!!" }, // Insfran, Cándido (Jefe de Combustible + Supervisor de Semana activo)
  piloto:                     { usuario: "1234567", password: "JoseSamudio1!!" }, // Samudio, José
  tecnicoVuelo:               { usuario: "1234512", password: "MariaJara2026!!" }, // Delgado, Darío — OJO: esta contraseña parece ser la de Jara, María por error de copiado hace tiempo, revisar si sigue sin usar en los tests que lo necesiten
}

// Chequeo rápido y reutilizable de "esta acción no está disponible" —
// usalo cuando quieras confirmar que un botón NO aparece para cierto
// rol, en vez de repetir el mismo expect en cada test.
export async function expectBotonAusente(page, nombreBoton) {
  await expect(page.getByRole("button", { name: nombreBoton })).toHaveCount(0)
}