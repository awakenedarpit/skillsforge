/**
 * Cross-platform launcher. Runs CPython with the backend folder as the working
 * directory so `python -m uvicorn` and `python -m app.seed` work on Windows,
 * macOS, and Linux. Honors PORT when starting uvicorn.
 */
const { spawn } = require("child_process");
const path = require("path");

const backend = path.join(__dirname, "..", "backend");
const args = process.argv.slice(2);

if (args[0] === "-m" && args[1] === "uvicorn") {
  if (!args.includes("--host")) {
    args.push("--host", "0.0.0.0");
  }
  if (!args.includes("--port")) {
    args.push("--port", process.env.PORT || "8000");
  }
}

const child = spawn("python", args, {
  cwd: backend,
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code) => {
  process.exit(code == null ? 1 : code);
});

child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
