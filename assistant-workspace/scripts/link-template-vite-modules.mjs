/**
 * Windows（hoisted bun + Vite bundle 配置）：临时文件在 web-src/node_modules/.vite-temp 下以 ESM
 * 执行 `import "vite"`。Node 的 ESM 解析器不使用 NODE_PATH，必须在 web-src/node_modules 中存在
 * 物理可解析的 vite / @vitejs/plugin-vue。安装完成后从 assistant-workspace/node_modules 建立
 * 目录 junction（Windows）或 symlink（Unix；可选，此处仅 Windows 执行链接）。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");
const nm = path.join(workspaceRoot, "node_modules");

if (process.platform !== "win32") {
  console.log("link-template-vite-modules: skip (Windows only)");
  process.exit(0);
}

const relativeTemplateRoots = [
  "../official-plugins/web-ai-assistant/web-src",
  "../official-plugins/desktop-ai-assistant/_ir/frontend/web-src",
  "../official-plugins/mobile-ai-assistant/web-src",
];

/** @type {string[][]} */
const packageSegments = [["vite"], ["@vitejs", "plugin-vue"]];

function linkDir(absSrc, dest) {
  if (!fs.existsSync(absSrc)) {
    throw new Error(`link-template-vite-modules: missing ${absSrc}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.symlinkSync(absSrc, dest, "junction");
}

for (const rel of relativeTemplateRoots) {
  const destBase = path.resolve(workspaceRoot, rel, "node_modules");
  for (const segments of packageSegments) {
    const src = path.join(nm, ...segments);
    const dest = path.join(destBase, ...segments);
    linkDir(src, dest);
  }
}

console.log("link-template-vite-modules: ok (junctions for vite + @vitejs/plugin-vue)");
