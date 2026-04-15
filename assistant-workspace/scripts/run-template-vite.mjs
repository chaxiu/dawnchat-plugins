/**
 * Windows CI（hoisted bun）：从各模板 web-src 下的 .vite-temp 加载配置时，Node 若仅从该目录向上找
 * node_modules，可能解析不到 vite。将 assistant-workspace/node_modules 加入 NODE_PATH，保证
 * vite.config.ts（bundle/runner）总能解析 vite 与 @vitejs/plugin-vue。
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const workspaceNodeModules = path.join(workspaceRoot, "node_modules");
const prev = process.env.NODE_PATH ?? "";
process.env.NODE_PATH = prev
  ? [workspaceNodeModules, prev].join(path.delimiter)
  : workspaceNodeModules;

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("run-template-vite: missing arguments (pass through to `bun x vite ...`)");
  process.exit(1);
}

const result = spawnSync("bun", ["x", "vite", ...args], {
  cwd: workspaceRoot,
  env: process.env,
  stdio: "inherit",
  shell: false,
});

process.exit(result.status === null ? 1 : result.status);
