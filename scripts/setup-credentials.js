#!/usr/bin/env node
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const envPath = path.join(process.cwd(), ".env.local");
const examplePath = path.join(process.cwd(), ".env.example");

let content = fs.existsSync(examplePath)
  ? fs.readFileSync(examplePath, "utf8")
  : "";

const encryptionKey = crypto.randomBytes(32).toString("hex");

if (!content.includes("ENCRYPTION_KEY=")) {
  content += `\nENCRYPTION_KEY=${encryptionKey}\n`;
} else if (!fs.existsSync(envPath)) {
  content = content.replace(
    /ENCRYPTION_KEY=.*/,
    `ENCRYPTION_KEY=${encryptionKey}`,
  );
}

if (fs.existsSync(envPath)) {
  console.log("✓ .env.local ya existe — no se sobrescribe");
  const existing = fs.readFileSync(envPath, "utf8");
  if (!existing.includes("ENCRYPTION_KEY=")) {
    fs.appendFileSync(envPath, `\nENCRYPTION_KEY=${encryptionKey}\n`);
    console.log("✓ ENCRYPTION_KEY añadida a .env.local existente");
  }
} else {
  fs.writeFileSync(envPath, content);
  console.log("✓ .env.local creado desde .env.example");
  console.log(`✓ ENCRYPTION_KEY generada: ${encryptionKey.slice(0, 8)}...`);
}

console.log("\nPróximos pasos:");
console.log("1. Edita .env.local con GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, MAIN_EMAIL");
console.log("2. npm run db:init");
console.log("3. npm run dev");
console.log("4. Abre http://localhost:3000/settings/integrations → Conectar Gmail");
console.log("\nGuía: docs/05-EMAIL-SETUP.md");
