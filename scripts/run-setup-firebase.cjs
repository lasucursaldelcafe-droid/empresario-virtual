const { spawnSync } = require("child_process");

const args = process.argv.slice(2);
const candidates =
  process.platform === "win32"
    ? [
        ["py", ["-3"]],
        ["py", []],
        ["python", []],
        ["python3", []],
      ]
    : [
        ["python3", []],
        ["python", []],
      ];

for (const [cmd, prefix] of candidates) {
  const result = spawnSync(cmd, [...prefix, "scripts/setup_firebase.py", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error?.code === "ENOENT") continue;
  process.exit(result.status ?? 1);
}

console.error("Python no encontrado. Ejecuta: py -3 scripts/setup_firebase.py");
process.exit(1);
