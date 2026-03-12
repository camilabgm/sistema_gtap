require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const nivelI = await prisma.nivelAcceso.upsert({
    where: { nivel: "I" },
    update: {},
    create: { nivel: "I" },
  });

  await prisma.nivelAcceso.upsert({
    where: { nivel: "II" },
    update: {},
    create: { nivel: "II" },
  });

  await prisma.nivelAcceso.upsert({
    where: { nivel: "III" },
    update: {},
    create: { nivel: "III" },
  });

  await prisma.nivelAcceso.upsert({
    where: { nivel: "IV" },
    update: {},
    create: { nivel: "IV" },
  });

  await prisma.nivelAcceso.upsert({
    where: { nivel: "V" },
    update: {},
    create: { nivel: "V" },
  });

  const rolComandante = await prisma.rol.upsert({
    where: { nombre: "Comandante" },
    update: {},
    create: {
      nombre: "Comandante",
      descripcion: "Acceso total al sistema",
    },
  });

  const persona = await prisma.persona.upsert({
    where: { nro_documento: "0000001" },
    update: {},
    create: {
      nombre: "Álvaro",
      apellido: "López Cattebeke",
      grado: "TCNEL DCEM",
      nro_documento: "0000001",
      escuadron: "PLANA_MAYOR",
      unidad: "Comandancia GTAP",
    },
  });

  const passwordHash = await bcrypt.hash("gtap2026", 10);

  await prisma.usuario.upsert({
    where: { username: "comandante" },
    update: {},
    create: {
      username: "comandante",
      password: passwordHash,
      persona_id: persona.id,
      rol_id: rolComandante.id,
      nivel_id: nivelI.id,
    },
  });

  console.log("✅ Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });