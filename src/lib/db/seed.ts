import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db, initDatabase } from "./index";
import { schema } from "./index";

const DEFAULT_COMPANY_ID = "default-company";

export async function seedDemoData() {
  await initDatabase();

  const existing = await db
    .select()
    .from(schema.companies)
    .where(eq(schema.companies.id, DEFAULT_COMPANY_ID))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(schema.companies).values({
      id: DEFAULT_COMPANY_ID,
      name: "Mi Empresa Demo",
      email: process.env.MAIN_EMAIL ?? "demo@empresario.local",
      createdAt: new Date(),
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  const txCount = await db.select().from(schema.transactions).limit(1);
  if (txCount.length === 0) {
    const demoTransactions = [
      { type: "income", amount: 850000, category: "Ventas", description: "Ventas del día" },
      { type: "income", amount: 120000, category: "Ventas", description: "Delivery" },
      { type: "expense", amount: 180000, category: "Proveedor A", description: "Café en grano" },
      { type: "expense", amount: 95000, category: "Proveedor B", description: "Lácteos" },
      { type: "expense", amount: 45000, category: "Servicios", description: "Energía" },
    ];

    for (const tx of demoTransactions) {
      await db.insert(schema.transactions).values({
        id: uuidv4(),
        companyId: DEFAULT_COMPANY_ID,
        type: tx.type,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
        date: today,
        createdAt: new Date(),
      });
    }
  }

  const docCount = await db.select().from(schema.documents).limit(1);
  if (docCount.length === 0) {
    const demoDocs = [
      { filename: "factura-proveedor-cafe-001.pdf", type: "invoice", amount: 180000, vendor: "Proveedor A" },
      { filename: "recibo-servicios-enero.pdf", type: "receipt", amount: 45000, vendor: "EPM" },
      { filename: "contrato-arrendamiento.pdf", type: "contract" },
    ];

    for (const doc of demoDocs) {
      await db.insert(schema.documents).values({
        id: uuidv4(),
        companyId: DEFAULT_COMPANY_ID,
        filename: doc.filename,
        type: doc.type,
        amount: doc.amount ?? null,
        vendor: doc.vendor ?? null,
        status: "pending",
        source: "demo",
        createdAt: new Date(),
      });
    }
  }

  const clientCount = await db.select().from(schema.clients).limit(1);
  if (clientCount.length === 0) {
    const demoClients = [
      { name: "María González", lastPurchaseDate: "2026-01-15", totalPurchases: 450000 },
      { name: "Carlos Ruiz", lastPurchaseDate: "2026-04-02", totalPurchases: 890000 },
      { name: "Ana Martínez", lastPurchaseDate: "2025-11-20", totalPurchases: 320000 },
      { name: "Pedro López", lastPurchaseDate: "2026-05-10", totalPurchases: 1200000 },
    ];

    for (const c of demoClients) {
      await db.insert(schema.clients).values({
        id: uuidv4(),
        companyId: DEFAULT_COMPANY_ID,
        name: c.name,
        lastPurchaseDate: c.lastPurchaseDate,
        totalPurchases: c.totalPurchases,
        status: "active",
        createdAt: new Date(),
      });
    }
  }

  const legalCount = await db.select().from(schema.legalObligations).limit(1);
  if (legalCount.length === 0) {
    const obligations = [
      { title: "Renovación Cámara de Comercio", type: "fiscal", dueDate: "2026-07-15" },
      { title: "Pago seguridad social empleados", type: "laboral", dueDate: "2026-07-05" },
      { title: "Declaración de renta", type: "fiscal", dueDate: "2026-08-30" },
    ];

    for (const o of obligations) {
      await db.insert(schema.legalObligations).values({
        id: uuidv4(),
        companyId: DEFAULT_COMPANY_ID,
        title: o.title,
        type: o.type,
        dueDate: o.dueDate,
        status: "pending",
        createdAt: new Date(),
      });
    }
  }

  return DEFAULT_COMPANY_ID;
}

export { DEFAULT_COMPANY_ID };
