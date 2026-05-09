require("dotenv").config()
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

// ============================================
// MÓDULOS DEL SISTEMA
// ============================================
const modulos = [
  "PERSONAS",
  "AERONAVES",
  "TIPOS_MISIONES",
  "ESCALAS",
  "POST_VUELO",
  "MANIFIESTO",
  "SICEM",
  "INFORMES",
  "INSPECCION_PREVUELO",
]

// ============================================
// MATRIZ DE PERMISOS POR ROL
// Estructura: [ver, crear, editar, eliminar, reportes]
// ============================================
const T = { puede_ver: true,  puede_crear: true,  puede_editar: true,  puede_eliminar: true,  puede_reportes: true  }
const F = { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false, puede_reportes: false }

const p = (ver, crear, editar, eliminar, reportes) => ({
  puede_ver: ver, puede_crear: crear, puede_editar: editar,
  puede_eliminar: eliminar, puede_reportes: reportes,
})

const permisosPorRol = {
  "Comandante": {
    PERSONAS:            T,
    AERONAVES:           T,
    TIPOS_MISIONES:      T,
    ESCALAS:             T,
    POST_VUELO:          T,
    MANIFIESTO:          T,
    SICEM:               T,
    INFORMES:            T,
    INSPECCION_PREVUELO: T,
  },
  "Jefe de Operaciones": {
    PERSONAS:            p(true,  false, false, false, true),
    AERONAVES:           p(true,  false, false, false, true),
    TIPOS_MISIONES:      p(true,  false, false, false, false),
    ESCALAS:             p(true,  true,  true,  false, true),
    POST_VUELO:          p(true,  false, false, false, true),
    MANIFIESTO:          p(true,  true,  true,  false, true),
    SICEM:               p(true,  false, false, false, true),
    INFORMES:            p(true,  false, false, false, true),
    INSPECCION_PREVUELO: p(true,  false, false, false, false),
  },
  "Jefe de Escuadrón": {
    PERSONAS:            p(true,  false, false, false, true),
    AERONAVES:           p(true,  false, false, false, true),
    TIPOS_MISIONES:      p(true,  false, false, false, false),
    ESCALAS:             p(true,  true,  true,  false, true),
    POST_VUELO:          p(true,  false, false, false, true),
    MANIFIESTO:          p(true,  true,  true,  false, true),
    SICEM:               p(true,  false, false, false, true),
    INFORMES:            p(true,  false, false, false, true),
    INSPECCION_PREVUELO: p(true,  false, false, false, false),
  },
  "Jefe de Mantenimiento": {
    PERSONAS:            p(true,  false, false, false, false),
    AERONAVES:           p(true,  true,  true,  false, true),
    TIPOS_MISIONES:      p(true,  false, false, false, false),
    ESCALAS:             p(true,  false, false, false, false),
    POST_VUELO:          p(true,  false, false, false, false),
    MANIFIESTO:          p(true,  false, false, false, false),
    SICEM:               p(true,  true,  true,  false, true),
    INFORMES:            p(true,  false, false, false, true),
    INSPECCION_PREVUELO: p(true,  true,  true,  false, true),
  },
  "Jefe Administrativo": {
    PERSONAS:            p(true,  true,  true,  false, true),
    AERONAVES:           p(true,  false, false, false, false),
    TIPOS_MISIONES:      p(true,  false, false, false, false),
    ESCALAS:             p(true,  false, false, false, false),
    POST_VUELO:          p(true,  false, false, false, false),
    MANIFIESTO:          p(true,  false, false, false, false),
    SICEM:               F,
    INFORMES:            p(true,  false, false, false, true),
    INSPECCION_PREVUELO: F,
  },
  "Piloto": {
    PERSONAS:            F,
    AERONAVES:           p(true,  false, false, false, false),
    TIPOS_MISIONES:      F,
    ESCALAS:             p(true,  false, false, false, false),
    POST_VUELO:          p(true,  true,  false, false, false),
    MANIFIESTO:          p(true,  false, false, false, false),
    SICEM:               F,
    INFORMES:            F,
    INSPECCION_PREVUELO: p(true,  true,  false, false, false),
  },
  "Copiloto": {
    PERSONAS:            F,
    AERONAVES:           p(true,  false, false, false, false),
    TIPOS_MISIONES:      F,
    ESCALAS:             p(true,  false, false, false, false),
    POST_VUELO:          p(true,  true,  false, false, false),
    MANIFIESTO:          p(true,  false, false, false, false),
    SICEM:               F,
    INFORMES:            F,
    INSPECCION_PREVUELO: p(true,  true,  false, false, false),
  },
  "Técnico de Vuelo": {
    PERSONAS:            F,
    AERONAVES:           p(true,  false, false, false, false),
    TIPOS_MISIONES:      F,
    ESCALAS:             p(true,  false, true,  false, false),
    POST_VUELO:          p(true,  true,  true,  false, false),
    MANIFIESTO:          p(true,  true,  true,  false, false),
    SICEM:               F,
    INFORMES:            F,
    INSPECCION_PREVUELO: p(true,  true,  false, false, false),
  },
  "Técnico de Mantenimiento": {
    PERSONAS:            F,
    AERONAVES:           p(true,  false, false, false, false),
    TIPOS_MISIONES:      F,
    ESCALAS:             F,
    POST_VUELO:          p(true,  false, false, false, false),
    MANIFIESTO:          F,
    SICEM:               p(true,  true,  true,  false, false),
    INFORMES:            F,
    INSPECCION_PREVUELO: p(true,  true,  true,  false, false),
  },
  "Estadística": {
    PERSONAS:            p(true,  false, false, false, true),
    AERONAVES:           p(true,  false, false, false, true),
    TIPOS_MISIONES:      F,
    ESCALAS:             p(true,  false, false, false, true),
    POST_VUELO:          p(true,  false, false, false, true),
    MANIFIESTO:          p(true,  false, false, false, true),
    SICEM:               p(true,  false, false, false, true),
    INFORMES:            p(true,  false, false, false, true),
    INSPECCION_PREVUELO: F,
  },
}

async function main() {

  // ============================================
  // ROLES DEL GTAP
  // ============================================
  const roles = [
    { nombre: "Comandante",               descripcion: "Comandante del GTAP — acceso total al sistema" },
    { nombre: "Jefe de Operaciones",      descripcion: "Gestión de escalas, manifiesto y tripulación" },
    { nombre: "Jefe de Escuadrón",        descripcion: "Comandante del Escuadrón Aéreo" },
    { nombre: "Jefe de Mantenimiento",    descripcion: "Gestión de aeronaves y SICEM" },
    { nombre: "Jefe Administrativo",      descripcion: "Gestión de personal e informes" },
    { nombre: "Piloto",                   descripcion: "Tripulante — visualización de sus vuelos asignados" },
    { nombre: "Copiloto",                 descripcion: "Tripulante — visualización de sus vuelos asignados" },
    { nombre: "Técnico de Vuelo",         descripcion: "Tripulante — registro post-vuelo" },
    { nombre: "Técnico de Mantenimiento", descripcion: "Registro de trabajos de mantenimiento" },
    { nombre: "Estadística",              descripcion: "Generación de informes y reportes" },
  ]

  const rolesCreados = {}

  for (const rol of roles) {
    const creado = await prisma.rol.upsert({
      where:  { nombre: rol.nombre },
      update: { descripcion: rol.descripcion },
      create: rol,
    })
    rolesCreados[rol.nombre] = creado
  }

  console.log(`✅ ${roles.length} roles cargados`)

  // ============================================
  // PERMISOS POR ROL (PermisoRol)
  // ============================================
  let permisosCreados = 0

  for (const [nombreRol, modulosPermisos] of Object.entries(permisosPorRol)) {
    const rol = rolesCreados[nombreRol]

    for (const modulo of modulos) {
      const permisos = modulosPermisos[modulo]

      await prisma.permisoRol.upsert({
        where: {
          rol_id_modulo: {
            rol_id: rol.id,
            modulo: modulo,
          },
        },
        update: permisos,
        create: {
          rol_id: rol.id,
          modulo: modulo,
          ...permisos,
        },
      })

      permisosCreados++
    }
  }

  console.log(`✅ ${permisosCreados} permisos de rol cargados`)

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
  // USUARIO DEL COMANDANTE — credenciales desde .env
  // ============================================
  const adminUser = process.env.GTAP_ADMIN_USER || "comandante"
  const adminPass = process.env.GTAP_ADMIN_PASS || "gtap2026"
  const passwordHash = await bcrypt.hash(adminPass, 10)

  await prisma.usuario.upsert({
    where:  { username: adminUser },
    update: {},
    create: {
      username:   adminUser,
      password:   passwordHash,
      persona_id: persona.id,
      rol_id:     rolesCreados["Comandante"].id,
    },
  })

  console.log(`✅ Usuario Comandante creado → username: ${adminUser}`)

  // ============================================
  // AERONAVES
  // ============================================
  const aeronaves = [
    { matricula: "FAP0250", tipo: "C-208B Caravan",           fabricante: "Cessna",     anio_fabricacion: 1990, anio_incorporacion: 2000, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0251", tipo: "C-208B Caravan",           fabricante: "Cessna",     anio_fabricacion: 1991, anio_incorporacion: 2001, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0252", tipo: "C-208B Caravan",           fabricante: "Cessna",     anio_fabricacion: 1992, anio_incorporacion: 2002, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0253", tipo: "C-208B Caravan",           fabricante: "Cessna",     anio_fabricacion: 1993, anio_incorporacion: 2003, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0254", tipo: "C-208B Caravan",           fabricante: "Cessna",     anio_fabricacion: 1994, anio_incorporacion: 2004, capacidad_pasajeros: 9,  tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP3001", tipo: "C-680 Citation Sovereign", fabricante: "Cessna",     anio_fabricacion: 2005, anio_incorporacion: 2010, capacidad_pasajeros: 12, tipo_combustible: "JET-A1", categoria: "PROPIA",    estado: "NO_DISPONIBLE" },
    { matricula: "FAP0235", tipo: "C-206",                    fabricante: "Cessna",     anio_fabricacion: 1985, anio_incorporacion: 1995, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "PROPIA",    estado: "DISPONIBLE"    },
    { matricula: "FAP0236", tipo: "C-206",                    fabricante: "Cessna",     anio_fabricacion: 1986, anio_incorporacion: 1996, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "PROPIA",    estado: "NO_DISPONIBLE" },
    { matricula: "FAP0814", tipo: "C-210",                    fabricante: "Cessna",     anio_fabricacion: 1980, anio_incorporacion: 2015, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0823", tipo: "C-206",                    fabricante: "Cessna",     anio_fabricacion: 1982, anio_incorporacion: 2016, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0824", tipo: "C-210",                    fabricante: "Cessna",     anio_fabricacion: 1981, anio_incorporacion: 2016, capacidad_pasajeros: 5,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0825", tipo: "C-172",                    fabricante: "Cessna",     anio_fabricacion: 1979, anio_incorporacion: 2017, capacidad_pasajeros: 3,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0901", tipo: "BE-90 King Air",           fabricante: "Beechcraft", anio_fabricacion: 1988, anio_incorporacion: 2018, capacidad_pasajeros: 7,  tipo_combustible: "JET-A1", categoria: "INCAUTADA", estado: "DISPONIBLE"    },
    { matricula: "FAP0902", tipo: "B-58 Baron",               fabricante: "Beechcraft", anio_fabricacion: 1975, anio_incorporacion: 2019, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0903", tipo: "B-58 Baron",               fabricante: "Beechcraft", anio_fabricacion: 1976, anio_incorporacion: 2019, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
    { matricula: "FAP0904", tipo: "B-55 Baron",               fabricante: "Beechcraft", anio_fabricacion: 1972, anio_incorporacion: 2020, capacidad_pasajeros: 4,  tipo_combustible: "AVGAS",  categoria: "INCAUTADA", estado: "NO_DISPONIBLE" },
  ]

  for (const aeronave of aeronaves) {
    await prisma.aeronave.upsert({
      where:  { matricula: aeronave.matricula },
      update: {},
      create: aeronave,
    })
  }

  console.log(`✅ ${aeronaves.length} aeronaves cargadas`)

  // ============================================
  // TIPOS DE MISIONES
  // ============================================
  const tiposMisiones = [
    { codigo: "VFMM", nombre: "Vuelos Militares FFMM",        categoria: "MILITAR",       descripcion: "Vuelos a cargo de las Fuerzas Militares" },
    { codigo: "VCOM", nombre: "Vuelos CONFAER",                categoria: "MILITAR",       descripcion: "Vuelos del Comando de la Fuerza Aérea" },
    { codigo: "VINS", nombre: "Instrucción",                   categoria: "MILITAR",       descripcion: "Vuelos de instrucción y entrenamiento" },
    { codigo: "VMAN", nombre: "Mantenimiento",                 categoria: "MILITAR",       descripcion: "Vuelos de traslado por mantenimiento" },
    { codigo: "VACS", nombre: "Acción Social",                 categoria: "MILITAR",       descripcion: "Vuelos de acción social" },
    { codigo: "VLPC", nombre: "Lanzamiento de PCD",            categoria: "MILITAR",       descripcion: "Vuelos de lanzamiento de paracaidistas" },
    { codigo: "VSAR", nombre: "Búsqueda y Rescate",            categoria: "MILITAR",       descripcion: "Vuelos de búsqueda y rescate" },
    { codigo: "CODI", nombre: "Apoyo al CODI",                 categoria: "INSTITUCIONAL", descripcion: "Vuelo de apoyo al Comando de Defensa Interna" },
    { codigo: "VAIP", nombre: "Apoyo a Instituciones Públicas",categoria: "INSTITUCIONAL", descripcion: "Vuelos de apoyo a instituciones del Estado" },
    { codigo: "VPRE", nombre: "Vuelos Presidenciales",         categoria: "INSTITUCIONAL", descripcion: "Vuelos de apoyo presidencial y vicepresidencial" },
    { codigo: "VRAL", nombre: "Vuelos Remunerados por Ley",    categoria: "INSTITUCIONAL", descripcion: "Vuelos remunerados autorizados por ley" },
    { codigo: "VEAM", nombre: "Evaluación Aeromédica",         categoria: "INSTITUCIONAL", descripcion: "Vuelos de evacuación y evaluación aeromédica" },
  ]

  for (const tipo of tiposMisiones) {
    await prisma.tipoMision.upsert({
      where:  { codigo: tipo.codigo },
      update: {},
      create: { ...tipo, activo: true },
    })
  }

  console.log(`✅ ${tiposMisiones.length} tipos de misiones cargados`)
  console.log("✅ Seed completado exitosamente")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })