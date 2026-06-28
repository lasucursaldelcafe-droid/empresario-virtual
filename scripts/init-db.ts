import { initDatabase } from "../src/lib/db";
import { seedDemoData } from "../src/lib/db/seed";

async function main() {
  await initDatabase();
  const companyId = await seedDemoData();
  console.log("✓ Base de datos inicializada");
  console.log(`✓ Empresa demo: ${companyId}`);
  console.log("✓ Datos de ejemplo cargados");
}

main().catch(console.error);
