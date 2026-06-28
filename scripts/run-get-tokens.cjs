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
  const result = spawnSync(cmd, [...prefix, "scripts/get_tokens.py", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.error?.code === "ENOENT") continue;
  process.exit(result.status ?? 1);
}

console.error(
  "Python no encontrado. Instala Python 3.10+ o ejecuta: py scripts/get_tokens.py",
);
process.exit(1);
