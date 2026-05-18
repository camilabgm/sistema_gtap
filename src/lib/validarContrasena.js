// Reglas de contraseña para el sistema GTAP
// Usado tanto en frontend (feedback al usuario) como en backend (API routes)

export function validarContrasena(password) {
  const errores = []

  if (password.length < 10) {
    errores.push("Debe tener al menos 10 caracteres")
  }
  if (!/[A-Z]/.test(password)) {
    errores.push("Debe incluir al menos una letra mayúscula")
  }
  if (!/[a-z]/.test(password)) {
    errores.push("Debe incluir al menos una letra minúscula")
  }
  if (!/[0-9]/.test(password)) {
    errores.push("Debe incluir al menos un número")
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errores.push("Debe incluir al menos un carácter especial (!@#$%...)")
  }

  return {
    valida:  errores.length === 0,
    errores,
  }
}