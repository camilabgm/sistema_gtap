// prisma/seed.js
// Ejecutar con: npx prisma db seed

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {

  // ── Roles ────────────────────────────────────────────────
  const roles = [
    { nombre: "Comandante",            descripcion: "Comandante del GTAP" },
    { nombre: "Jefe de Operaciones",   descripcion: "Jefe del área de operaciones" },
    { nombre: "Jefe de Mantenimiento", descripcion: "Jefe del escuadrón de material" },
    { nombre: "Piloto",                descripcion: "Piloto de aeronave" },
    { nombre: "Copiloto",              descripcion: "Copiloto de aeronave" },
    { nombre: "Técnico de Vuelo",      descripcion: "Técnico de vuelo" },
    { nombre: "Jefe de Personal",      descripcion: "Jefe de la sección personal" },
    { nombre: "Jefe de Logística",     descripcion: "Jefe del área de logística" },
    { nombre: "Mecánico",              descripcion: "Mecánico de aeronaves" },
    { nombre: "Administrativo",        descripcion: "Personal administrativo" },
  ]

  for (const rol of roles) {
    await prisma.rol.upsert({
      where:  { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: rol,
    })
  }

  console.log("✅ Roles cargados")

  // ── Usuario Comandante ───────────────────────────────────
  const rolComandante = await prisma.rol.findUnique({
    where: { nombre: "Comandante" },
  })

  const personaComandante = await prisma.persona.upsert({
    where:  { nro_documento: "00000001" },
    update: {},
    create: {
      nombre:        "Álvaro",
      apellido:      "López Cattebeke",
      grado:         "TCNEL DCEM",
      nro_documento: "00000001",
      escuadron:     "PLANA_MAYOR",
      unidad:        "Comandancia GTAP",
      creado_por:    1,
    },
  })

  const passwordHash = await bcrypt.hash("gtap2026", 10)

  await prisma.usuario.upsert({
    where:  { username: "comandante" },
    update: {},
    create: {
      username:         "comandante",
      password:         passwordHash,
      password_temporal: true,
      persona_id:       personaComandante.id,
      rol_id:           rolComandante.id,
      creado_por:       1,
    },
  })

  console.log("✅ Usuario Comandante cargado")

  // ── Tipos de Misiones — OG COMFAER 2026 ─────────────────
  // 19 registros: 3 operacionales + 13 tipos de vuelo + 3 logísticos

  const tiposMisiones = [

    // ── CLASIFICACIÓN OPERACIONAL (3) ──────────────────────
    {
      codigo:        "VMIL",
      nombre:        "Vuelo Militar",
      clasificacion: "OPERACIONAL",
      descripcion:   "Se aplicará a los vuelos correspondientes a misiones de carácter militar.",
    },
    {
      codigo:        "VAIP",
      nombre:        "Vuelo de Apoyo a Instituciones Públicas",
      clasificacion: "OPERACIONAL",
      descripcion:   "Se aplicará a los vuelos en apoyo a instituciones públicas del Estado.",
    },
    {
      codigo:        "VARA",
      nombre:        "Vuelo de Arrendamiento de Aeronave",
      clasificacion: "OPERACIONAL",
      descripcion:   "Se aplicará a los vuelos realizados en arrendamiento a terceros.",
    },

    // ── TIPO DE VUELO (13) ─────────────────────────────────
    {
      codigo:        "INS",
      nombre:        "Instrucción",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelos cuya actividad sea la instrucción y mantenimiento operacional de las tripulaciones aéreas.",
    },
    {
      codigo:        "MAN",
      nombre:        "Mantenimiento de Aeronave",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelos cuya actividad esté relacionada al mantenimiento de la aeronave.",
    },
    {
      codigo:        "OPR",
      nombre:        "Operacional",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos de carácter táctico-operacional.",
    },
    {
      codigo:        "DEM",
      nombre:        "Demostración y Exhibición",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelos en cumplimiento de desfile aéreo y demostración aérea.",
    },
    {
      codigo:        "LPC",
      nombre:        "Lanzamiento de Paracaidistas o Cargas",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelo de cumplimiento de misiones aeroterrestres de lanzamiento de paracaidistas y/o carga.",
    },
    {
      codigo:        "PRE",
      nombre:        "Presidencial",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos cuya actividad sea el traslado del Señor Presidente, Vicepresidente y/o comitiva.",
    },
    {
      codigo:        "TAU",
      nombre:        "Transporte de Autoridades y Comitivas",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelos cuya actividad sea el traslado de autoridades y/o comitivas no presidenciales.",
    },
    {
      codigo:        "AME",
      nombre:        "Aeromédico",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Vuelos de transporte aeromédico: traslado de pacientes, órganos de ablación, vacunas, insumos y personal médico.",
      tiene_subtipo: false,
    },
    {
      codigo:        "SAR",
      nombre:        "Búsqueda y Rescate",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos de búsqueda y rescate de personas o aeronaves desaparecidas o accidentadas, y asistencia humanitaria ante desastres.",
    },
    {
      codigo:        "ACS",
      nombre:        "Acción Social",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos de apoyo a poblaciones aisladas y/o de escasos recursos con tarifa social.",
    },
    {
      codigo:        "HUM",
      nombre:        "Humanitario",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos destinados a aliviar el sufrimiento humano.",
    },
    {
      codigo:        "PRA",
      nombre:        "Protección Ambiental",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Se aplicará a los vuelos destinados a mitigar y/o combatir los efectos de desastres naturales.",
    },
    {
      codigo:        "TRA",
      nombre:        "Transporte Aéreo",
      clasificacion: "TIPO_VUELO",
      descripcion:   "Demás vuelos destinados a transporte de pasajeros y/o cargas no mencionados anteriormente.",
    },

    // ── CLASIFICACIÓN LOGÍSTICA (3) ────────────────────────
    {
      codigo:        "FAP",
      nombre:        "Fuerza Aérea Paraguaya",
      clasificacion: "LOGISTICA",
      descripcion:   "La provisión de combustible, lubricantes, viáticos y gastos serán a cargo de la FAP.",
    },
    {
      codigo:        "IPE",
      nombre:        "Instituciones Públicas del Estado",
      clasificacion: "LOGISTICA",
      descripcion:   "La institución pública se hace cargo de los gastos de operación según el Catálogo Oficial de Precios de la FAP.",
    },
    {
      codigo:        "ARE",
      nombre:        "Arrendatario",
      clasificacion: "LOGISTICA",
      descripcion:   "El arrendatario firma contrato de prestación de servicios con la FAP y cubre todos los gastos inherentes.",
    },
  ]

  for (const tipo of tiposMisiones) {
    await prisma.tipoMision.upsert({
      where:  { codigo: tipo.codigo },
      update: {
        nombre:        tipo.nombre,
        clasificacion: tipo.clasificacion,
        descripcion:   tipo.descripcion   || null,
        tiene_subtipo: tipo.tiene_subtipo || false,
        subtipo:       tipo.subtipo       || null,
      },
      create: {
        codigo:        tipo.codigo,
        nombre:        tipo.nombre,
        clasificacion: tipo.clasificacion,
        descripcion:   tipo.descripcion   || null,
        tiene_subtipo: tipo.tiene_subtipo || false,
        subtipo:       tipo.subtipo       || null,
        creado_por:    1,
      },
    })
  }

  console.log("✅ Tipos de misiones cargados (19 del OG COMFAER 2026)")

  // ── Aeronaves ────────────────────────────────────────────
  // (el seed de aeronaves que ya tenés se mantiene igual)
  // Solo agregar si querés re-seedearlas, no es obligatorio para esta migración

  console.log("\n🎉 Seed completado correctamente")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
