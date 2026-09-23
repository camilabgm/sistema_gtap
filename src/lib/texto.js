// src/lib/texto.js
//
// Funciones de normalización de texto compartidas — antes vivían
// duplicadas dentro de PersonasTable.js y ParteDiarioPage.js.
//
// Ojo: son dos normalizaciones DISTINTAS, para dos propósitos
// distintos. No usar una por la otra.

// Para COMPARAR mientras alguien busca — nunca se usa para guardar
// nada, solo para que el filtro de una tabla o un selector encuentre
// "José" al escribir "jose". Saca tildes y pasa a minúsculas.
export function normalizarParaBusqueda(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

// Para GUARDAR o AGRUPAR nombres de instituciones (ej. Escala.solicitante).
// Saca espacios de más y pasa a mayúsculas — mismo formato que ya usa
// el Memo 40 institucional (ANDE, OCD, PRESIDENCIA). A propósito NO
// saca tildes acá: una institución real puede tener tilde en su
// nombre ("MINISTERIO DE EDUCACIÓN") y sacarla sería introducir un
// error, no corregir uno.
export function normalizarNombreInstitucion(texto) {
  return (texto || "").trim().replace(/\s+/g, " ").toUpperCase()
}