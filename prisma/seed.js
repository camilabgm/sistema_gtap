// Ejecutar con: npx prisma db seed

const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {

  // ─── Paso 1: Renombrar roles que cambiaron de nombre ──────────────────
  await prisma.rol.updateMany({
    where: { nombre: "Jefe de Escuadrón", deleted_at: null },
    data:  { nombre: "Comandante del Escuadrón Aéreo" },
  })
  await prisma.rol.updateMany({
    where: { nombre: "Jefe de Mantenimiento", deleted_at: null },
    data:  { nombre: "Comandante del Escuadrón de Mantenimiento" },
  })
  console.log("✅ Roles renombrados")

  // ─── Paso 2: Soft-delete roles obsoletos (sin usuarios) ───────────────
  await prisma.rol.updateMany({
    where: {
      nombre:     { in: ["Administrativo", "Jefe Administrativo", "Jefe de Logística", "Mecánico", "Técnico de Mantenimiento"] },
      deleted_at: null,
    },
    data: { deleted_at: new Date() },
  })
  console.log("✅ Roles obsoletos eliminados")

  // ─── Paso 3: Crear / asegurar los 12 roles del Excel ─────────────────
  const roles = [
    { nombre: "Comandante",                                descripcion: "Comandante del GTAP — acceso total" },
    { nombre: "Jefe de Operaciones",                       descripcion: "Jefe del área de operaciones — acceso total" },
    { nombre: "Comandante del Escuadrón Aéreo",            descripcion: "Comandante del Escuadrón Aéreo" },
    { nombre: "Jefe de Programación y Control",            descripcion: "Prog. y Control del Escuadrón Aéreo" },
    { nombre: "Comandante del Escuadrón de Mantenimiento", descripcion: "Comandante del Escuadrón de Mantenimiento" },
    { nombre: "Jefe de Personal",                          descripcion: "Jefe de la sección de Personal" },
    { nombre: "Piloto",                                    descripcion: "Piloto de aeronave" },
    { nombre: "Copiloto",                                  descripcion: "Copiloto de aeronave" },
    { nombre: "Técnico de Vuelo",                          descripcion: "Técnico de vuelo" },
    { nombre: "Supervisor de Semana",                      descripcion: "Supervisor de Semana de la Línea de Vuelo" },
    { nombre: "Estadística",                               descripcion: "División de Estadística" },
    { nombre: "General (Personal sin rol específico)",     descripcion: "Personal del GTAP sin rol operativo específico" },
  ]

  for (const rol of roles) {
    await prisma.rol.upsert({
      where:  { nombre: rol.nombre },
      update: { descripcion: rol.descripcion, deleted_at: null },
      create: rol,
    })
  }
  console.log("✅ 12 roles asegurados")

  // ─── Paso 4: Vaciar permisos existentes para recargar limpios ─────────
  await prisma.permisoUsuario.deleteMany({})
  await prisma.permisoRol.deleteMany({})
  console.log("✅ Permisos anteriores eliminados")

  // ─── Paso 5: Cargar permisos según Resumen General PERMISOS_GTAP ─────
  // Formato por módulo: [ver, crear, editar, eliminar, reportes]  1=true 0=false
  // Módulos del Excel — INSPECCION_PREVUELO queda sin permisos (diferida a Fase 2)

  const matrizPermisos = {
    "Comandante": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,1,1,1,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,1,1,1,1],
      AERONAVES:      [1,1,1,1,1],
      SICEM:          [1,1,1,1,1],
      INFORMES:       [1,1,1,1,1],
      TIPOS_MISIONES: [1,1,1,1,1],
    },
    "Jefe de Operaciones": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,1,1,1,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,1,1,1,1],
      AERONAVES:      [1,1,1,1,1],
      SICEM:          [1,1,1,1,1],
      INFORMES:       [1,1,1,1,1],
      TIPOS_MISIONES: [1,1,1,1,1],
    },
    "Comandante del Escuadrón Aéreo": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,1,1,1,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,1,1,1,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,1],
      INFORMES:       [1,1,1,1,1],
      TIPOS_MISIONES: [1,1,1,1,1],
    },
    "Jefe de Programación y Control": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,1,1,1,1],
      MANIFIESTO:     [1,0,0,0,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,0],
      INFORMES:       [1,1,1,1,1],
      TIPOS_MISIONES: [1,1,1,1,1],
    },
    "Comandante del Escuadrón de Mantenimiento": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,0,0,0,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,1,1,1,1],
      SICEM:          [1,1,1,1,1],
      INFORMES:       [1,0,0,0,1],
      TIPOS_MISIONES: [1,0,0,0,1],
    },
    "Jefe de Personal": {
      ESCALAS:        [1,1,1,1,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,0,0,0,1],
      PERSONAS:       [1,1,1,1,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,0],
      INFORMES:       [1,0,0,0,1],
      TIPOS_MISIONES: [1,0,0,0,1],
    },
    "Piloto": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,0],
      INFORMES:       [0,0,0,0,0],
      TIPOS_MISIONES: [0,0,0,0,0],
    },
    "Copiloto": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,0],
      INFORMES:       [0,0,0,0,0],
      TIPOS_MISIONES: [0,0,0,0,0],
    },
    "Técnico de Vuelo": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,0],
      INFORMES:       [0,0,0,0,0],
      TIPOS_MISIONES: [0,0,0,0,0],
    },
    "Supervisor de Semana": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,1,1,1,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,1],
      INFORMES:       [0,0,0,0,0],
      TIPOS_MISIONES: [0,0,0,0,0],
    },
    "Estadística": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,0,0,0,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,1],
      INFORMES:       [1,0,0,0,1],
      TIPOS_MISIONES: [1,0,0,0,1],
    },
    "General (Personal sin rol específico)": {
      ESCALAS:        [1,0,0,0,1],
      POST_VUELO:     [1,0,0,0,1],
      MANIFIESTO:     [1,0,0,0,1],
      PERSONAS:       [1,0,0,0,1],
      AERONAVES:      [1,0,0,0,1],
      SICEM:          [1,0,0,0,1],
      INFORMES:       [1,0,0,0,1],
      TIPOS_MISIONES: [1,0,0,0,1],
    },
  }

  let totalPermisos = 0
  for (const [nombreRol, modulos] of Object.entries(matrizPermisos)) {
    const rol = await prisma.rol.findFirst({
      where: { nombre: nombreRol, deleted_at: null },
    })
    if (!rol) {
      console.warn(`⚠️  Rol no encontrado: ${nombreRol}`)
      continue
    }
    for (const [modulo, [ver, crear, editar, eliminar, reportes]] of Object.entries(modulos)) {
      await prisma.permisoRol.create({
        data: {
          rol_id:         rol.id,
          modulo,
          puede_ver:      ver      === 1,
          puede_crear:    crear    === 1,
          puede_editar:   editar   === 1,
          puede_eliminar: eliminar === 1,
          puede_reportes: reportes === 1,
          creado_por:     1,
        },
      })
      totalPermisos++
    }
  }
  console.log(`✅ ${totalPermisos} permisos cargados`)

  // ─── Usuario Comandante ───────────────────────────────────────────────
  const rolComandante = await prisma.rol.findUnique({
    where: { nombre: "Comandante" },
  })

  const personaComandante = await prisma.persona.upsert({
    where:  { nro_documento: "0000001" },
    update: {},
    create: {
      nombre:        "Álvaro",
      apellido:      "López Cattebeke",
      grado:         "TCNEL DCEM",
      nro_documento: "0000001",
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
      username:          "comandante",
      password:          passwordHash,
      password_temporal: true,
      persona_id:        personaComandante.id,
      rol_id:            rolComandante.id,
      creado_por:        1,
    },
  })
  console.log("✅ Usuario Comandante asegurado")

  // ─── Tipos de Misiones — OG COMFAER 2026 ─────────────────────────────
  const tiposMisiones = [
    { codigo: "VMIL", nombre: "Vuelo Militar",                            clasificacion: "OPERACIONAL", descripcion: "Se aplicará a los vuelos correspondientes a misiones de carácter militar." },
    { codigo: "VAIP", nombre: "Vuelo de Apoyo a Instituciones Públicas",  clasificacion: "OPERACIONAL", descripcion: "Se aplicará a los vuelos en apoyo a instituciones públicas del Estado." },
    { codigo: "VARA", nombre: "Vuelo de Arrendamiento de Aeronave",       clasificacion: "OPERACIONAL", descripcion: "Se aplicará a los vuelos realizados en arrendamiento a terceros." },
    { codigo: "INS",  nombre: "Instrucción",                              clasificacion: "TIPO_VUELO",  descripcion: "Vuelos cuya actividad sea la instrucción y mantenimiento operacional de las tripulaciones aéreas." },
    { codigo: "MAN",  nombre: "Mantenimiento de Aeronave",                clasificacion: "TIPO_VUELO",  descripcion: "Vuelos cuya actividad esté relacionada al mantenimiento de la aeronave." },
    { codigo: "OPR",  nombre: "Operacional",                              clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos de carácter táctico-operacional." },
    { codigo: "DEM",  nombre: "Demostración y Exhibición",                clasificacion: "TIPO_VUELO",  descripcion: "Vuelos en cumplimiento de desfile aéreo y demostración aérea." },
    { codigo: "LPC",  nombre: "Lanzamiento de Paracaidistas o Cargas",    clasificacion: "TIPO_VUELO",  descripcion: "Vuelo de cumplimiento de misiones aeroterrestres de lanzamiento de paracaidistas y/o carga." },
    { codigo: "PRE",  nombre: "Presidencial",                             clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos cuya actividad sea el traslado del Señor Presidente, Vicepresidente y/o comitiva." },
    { codigo: "TAU",  nombre: "Transporte de Autoridades y Comitivas",    clasificacion: "TIPO_VUELO",  descripcion: "Vuelos cuya actividad sea el traslado de autoridades y/o comitivas no presidenciales." },
    { codigo: "AME",  nombre: "Aeromédico",                               clasificacion: "TIPO_VUELO",  descripcion: "Vuelos de transporte aeromédico: traslado de pacientes, órganos de ablación, vacunas, insumos y personal médico." },
    { codigo: "SAR",  nombre: "Búsqueda y Rescate",                       clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos de búsqueda y rescate de personas o aeronaves desaparecidas o accidentadas, y asistencia humanitaria ante desastres." },
    { codigo: "ACS",  nombre: "Acción Social",                            clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos de apoyo a poblaciones aisladas y/o de escasos recursos con tarifa social." },
    { codigo: "HUM",  nombre: "Humanitario",                              clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos destinados a aliviar el sufrimiento humano." },
    { codigo: "PRA",  nombre: "Protección Ambiental",                     clasificacion: "TIPO_VUELO",  descripcion: "Se aplicará a los vuelos destinados a mitigar y/o combatir los efectos de desastres naturales." },
    { codigo: "TRA",  nombre: "Transporte Aéreo",                         clasificacion: "TIPO_VUELO",  descripcion: "Demás vuelos destinados a transporte de pasajeros y/o cargas no mencionados anteriormente." },
    { codigo: "FAP",  nombre: "Fuerza Aérea Paraguaya",                   clasificacion: "LOGISTICA",   descripcion: "La provisión de combustible, lubricantes, viáticos y gastos serán a cargo de la FAP." },
    { codigo: "IPE",  nombre: "Instituciones Públicas del Estado",        clasificacion: "LOGISTICA",   descripcion: "La institución pública se hace cargo de los gastos de operación según el Catálogo Oficial de Precios de la FAP." },
    { codigo: "ARE",  nombre: "Arrendatario",                             clasificacion: "LOGISTICA",   descripcion: "El arrendatario firma contrato de prestación de servicios con la FAP y cubre todos los gastos inherentes." },
  ]

  for (const tipo of tiposMisiones) {
    await prisma.tipoMision.upsert({
      where:  { codigo: tipo.codigo },
      update: { nombre: tipo.nombre, clasificacion: tipo.clasificacion, descripcion: tipo.descripcion },
      create: { ...tipo, tiene_subtipo: false, subtipo: null, creado_por: 1 },
    })
  }
  console.log("✅ Tipos de misiones asegurados (19)")

  console.log("\n🎉 Seed completado correctamente")
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })