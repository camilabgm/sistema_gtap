require("dotenv").config()
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

const modulos = [
  "PERSONAS",
  "AERONAVES",
  "TIPOS_MISIONES",
  "ESCALAS",
  "MANIFIESTO",
  "SICEM",
  "INFORMES",
  "INSPECCION_PREVUELO",
]

async function main() {

  // ============================================
  // NIVELES DE ACCESO CON DESCRIPCIÓN
  // ============================================
  const niveles = [
    {
      nivel:       "I",
      descripcion: "Acceso total — ver, crear, editar, eliminar y reportes en todos los módulos",
    },
    {
      nivel:       "II",
      descripcion: "Acceso amplio — ver, crear y editar. Sin eliminar registros",
    },
    {
      nivel:       "III",
      descripcion: "Acceso intermedio — ver y crear. Sin editar ni eliminar",
    },
    {
      nivel:       "IV",
      descripcion: "Acceso limitado — solo visualización e informes",
    },
    {
      nivel:       "V",
      descripcion: "Acceso mínimo — solo visualización, sin informes",
    },
  ]

  const nivelesCreados = {}

  for (const n of niveles) {
    const nivel = await prisma.nivelAcceso.upsert({
      where:  { nivel: n.nivel },
      update: { descripcion: n.descripcion },
      create: { nivel: n.nivel, descripcion: n.descripcion },
    })
    nivelesCreados[n.nivel] = nivel
  }

  // ============================================
  // PERMISOS POR NIVEL — para todos los módulos
  // ============================================

  // Definimos qué puede hacer cada nivel
  const permisosPorNivel = {
    I:   { puede_ver: true,  puede_crear: true,  puede_editar: true,  puede_eliminar: true,  puede_reportes: true  },
    II:  { puede_ver: true,  puede_crear: true,  puede_editar: true,  puede_eliminar: false, puede_reportes: true  },
    III: { puede_ver: true,  puede_crear: true,  puede_editar: false, puede_eliminar: false, puede_reportes: true  },
    IV:  { puede_ver: true,  puede_crear: false, puede_editar: false, puede_eliminar: false, puede_reportes: true  },
    V:   { puede_ver: true,  puede_crear: false, puede_editar: false, puede_eliminar: false, puede_reportes: false },
  }

  // Para cada nivel, cargamos sus permisos en todos los módulos
  for (const [nivelKey, permisos] of Object.entries(permisosPorNivel)) {
    const nivel = nivelesCreados[nivelKey]

    for (const modulo of modulos) {
      await prisma.permiso.upsert({
        where: {
          nivel_id_modulo: {
            nivel_id: nivel.id,
            modulo:   modulo,
          },
        },
        update: permisos,
        create: {
          nivel_id: nivel.id,
          modulo:   modulo,
          ...permisos,
        },
      })
    }
  }

  // ============================================
  // ROLES DEL GTAP
  // ============================================
  const roles = [
    { nombre: "Comandante",              descripcion: "Comandante del GTAP — acceso total al sistema" },
    { nombre: "Jefe de Operaciones",     descripcion: "Gestión de escalas, manifiesto y tripulación" },
    { nombre: "Jefe de Escuadrón",       descripcion: "Comandante del Escuadrón Aéreo" },
    { nombre: "Jefe de Mantenimiento",   descripcion: "Gestión de aeronaves y SICEM" },
    { nombre: "Jefe Administrativo",     descripcion: "Gestión de personal e informes" },
    { nombre: "Piloto",                  descripcion: "Tripulante — visualización de sus vuelos asignados" },
    { nombre: "Copiloto",                descripcion: "Tripulante — visualización de sus vuelos asignados" },
    { nombre: "Técnico de Vuelo",        descripcion: "Tripulante — registro post-vuelo" },
    { nombre: "Técnico de Mantenimiento",descripcion: "Registro de trabajos de mantenimiento" },
    { nombre: "Estadística",             descripcion: "Generación de informes y reportes" },
  ]

  for (const rol of roles) {
    await prisma.rol.upsert({
      where:  { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: rol,
    })
  }

  // ============================================
  // PERSONA DEL COMANDANTE
  // ============================================
  const persona = await prisma.persona.upsert({
    where:  { nro_documento: "0000001" },
    update: {},
    create: {
      nombre:        "Álvaro",
      apellido:      "López Cattebeke",
      grado:         "TCNEL DCEM",
      nro_documento: "0000001",
      escuadron:     "PLANA_MAYOR",
      unidad:        "Comandancia GTAP",
    },
  })

  // ============================================
  // ROL COMANDANTE
  // ============================================
  const rolComandante = await prisma.rol.findUnique({
    where: { nombre: "Comandante" },
  })

  // ============================================
  // USUARIO DEL COMANDANTE
  // ============================================
  const passwordHash = await bcrypt.hash("gtap2026", 10)

  await prisma.usuario.upsert({
    where:  { username: "comandante" },
    update: {},
    create: {
      username:   "comandante",
      password:   passwordHash,
      persona_id: persona.id,
      rol_id:     rolComandante.id,
      nivel_id:   nivelesCreados["I"].id,
    },
  })

  // ============================================
  // AERONAVES
  // ============================================
  const aeronaves = [
    { matricula: "FAP0250", tipo: "C-208B Caravan",         fabricante: "Cessna",     anio_fabricacion: 1990, anio_incorporacion: 2000, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0251", tipo: "C-208B Caravan",         fabricante: "Cessna",     anio_fabricacion: 1991, anio_incorporacion: 2001, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0252", tipo: "C-208B Caravan",         fabricante: "Cessna",     anio_fabricacion: 1992, anio_incorporacion: 2002, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0253", tipo: "C-208B Caravan",         fabricante: "Cessna",     anio_fabricacion: 1993, anio_incorporacion: 2003, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0254", tipo: "C-208B Caravan",         fabricante: "Cessna",     anio_fabricacion: 1994, anio_incorporacion: 2004, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP3001", tipo: "C-680 Citation Sovereign",fabricante: "Cessna",    anio_fabricacion: 2005, anio_incorporacion: 2010, capacidad_pasajeros: 12, tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "NO_DISPONIBLE" },
    { matricula: "FAP0235", tipo: "C-206",                  fabricante: "Cessna",     anio_fabricacion: 1985, anio_incorporacion: 1995, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0236", tipo: "C-206",                  fabricante: "Cessna",     anio_fabricacion: 1986, anio_incorporacion: 1996, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "PROPIA",    estado: "NO_DISPONIBLE" },
    { matricula: "FAP0814", tipo: "C-210",                  fabricante: "Cessna",     anio_fabricacion: 1980, anio_incorporacion: 2015, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0823", tipo: "C-206",                  fabricante: "Cessna",     anio_fabricacion: 1982, anio_incorporacion: 2016, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0824", tipo: "C-210",                  fabricante: "Cessna",     anio_fabricacion: 1981, anio_incorporacion: 2016, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0825", tipo: "C-172",                  fabricante: "Cessna",     anio_fabricacion: 1979, anio_incorporacion: 2017, capacidad_pasajeros: 3,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0901", tipo: "BE-90 King Air",         fabricante: "Beechcraft", anio_fabricacion: 1988, anio_incorporacion: 2018, capacidad_pasajeros: 7,  tipo_combustible: "JET-A1", categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0902", tipo: "B-58 Baron",             fabricante: "Beechcraft", anio_fabricacion: 1975, anio_incorporacion: 2019, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0903", tipo: "B-58 Baron",             fabricante: "Beechcraft", anio_fabricacion: 1976, anio_incorporacion: 2019, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0904", tipo: "B-55 Baron",             fabricante: "Beechcraft", anio_fabricacion: 1972, anio_incorporacion: 2020, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
  ]

  for (const aeronave of aeronaves) {
    await prisma.aeronave.upsert({
      where:  { matricula: aeronave.matricula },
      update: {},
      create: aeronave,
    })
  }

  console.log("✅ Seed completado exitosamente")
  console.log(`   → 5 niveles de acceso con permisos cargados`)
  console.log(`   → ${roles.length} roles del GTAP cargados`)
  console.log(`   → ${aeronaves.length} aeronaves cargadas`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })