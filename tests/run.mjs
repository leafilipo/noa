// Boots a fresh local Worker (empty D1 in a temp folder), runs the test files, shuts it down. `npm test`.
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = process.env.TEST_PORT || "8799";
const state = mkdtempSync(join(tmpdir(), "hs-test-"));
const wrangler = join(process.cwd(), "node_modules", ".bin", "wrangler");
const dev = spawn(wrangler, ["dev", "--port", PORT, "--local", "--persist-to", state, "--var", "ACCESS_TEAM_DOMAIN:", "--var", "ACCESS_AUD:", "--var", "PUBLIC_HOSTS:127.0.0.1", "--var", "USERS:{\"lea@huit.studio\":\"Lea\",\"guest@example.com\":\"Guest\"}", "--var", "PUBLISHERS:Lea"], { stdio: ["ignore", "pipe", "pipe"] });
let log = ""; dev.stdout.on("data", d => { log += d; }); dev.stderr.on("data", d => { log += d; });

const base = `http://localhost:${PORT}`;
const up = async () => { for (let i = 0; i < 60; i++) { try { const r = await fetch(base + "/api/me", { headers: { "cf-access-authenticated-user-email": "lea@huit.studio" } }); if (r.status === 200) return true; } catch (e) {} await new Promise(r => setTimeout(r, 1000)); } return false; };

let code = 1;
try {
  if (!(await up())) { console.error("The local Worker did not start.\n" + log.slice(-2000)); }
  else {
    const r = spawnSync(process.execPath, ["--test", "tests/worker.test.mjs", "tests/render.test.mjs"], { stdio: "inherit", env: { ...process.env, TEST_BASE: base } });
    code = r.status ?? 1;
  }
} finally {
  dev.kill("SIGTERM");
  setTimeout(() => { try { rmSync(state, { recursive: true, force: true }); } catch (e) {} process.exit(code); }, 500);
}
