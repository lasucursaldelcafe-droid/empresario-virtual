const { spawn, spawnSync } = require("child_process");

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
  const probe = spawnSync(cmd, [...prefix, "--version"], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
  if (probe.error?.code === "ENOENT") continue;

  const child = spawn(cmd, [...prefix, "launcher/main.py"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: process.cwd(),
  });
  child.on("exit", (code) => process.exit(code ?? 1));
  return;
}

console.error(
  "Python no encontrado. Instala Python 3.10+ o ejecuta: py launcher/main.py",
);
process.exit(1);
