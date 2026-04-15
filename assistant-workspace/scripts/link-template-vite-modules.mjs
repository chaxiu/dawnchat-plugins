/**
 * Windows（hoisted bun）：Vite 配置与 Rollup 打包都从各模板 web-src 解析 npm 包。
 * Node ESM 不用 NODE_PATH；若 web-src/node_modules 下缺少 vite/vue/…，会在 .vite-temp 或
 * Rollup 阶段报错。安装完成后，将 assistant-workspace/node_modules 中**该模板 package.json
 * 声明的依赖**以目录 junction 接到对应 web-src/node_modules（仅 Windows）。
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

/**
 * @param {string} pkgPath
 * @returns {Set<string>}
 */
function collectPackageNames(pkgPath) {
  const raw = fs.readFileSync(pkgPath, "utf8");
  const json = JSON.parse(raw);
  const names = new Set();
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const obj = json[section];
    if (!obj || typeof obj !== "object") continue;
    for (const name of Object.keys(obj)) {
      if (!name || name.startsWith("//")) continue;
      names.add(name);
    }
  }
  return names;
}

/**
 * @param {string} absSrc
 * @param {string} dest
 */
function linkDir(absSrc, dest) {
  if (!fs.existsSync(absSrc)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.symlinkSync(path.resolve(absSrc), dest, "junction");
  return true;
}

let linked = 0;
let skipped = 0;

for (const rel of relativeTemplateRoots) {
  const templateRoot = path.resolve(workspaceRoot, rel);
  const pkgPath = path.join(templateRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`link-template-vite-modules: missing ${pkgPath}`);
  }
  const destBase = path.join(templateRoot, "node_modules");
  for (const name of collectPackageNames(pkgPath)) {
    const src = path.join(nm, ...name.split("/"));
    const dest = path.join(destBase, ...name.split("/"));
    if (linkDir(src, dest)) {
      linked += 1;
    } else {
      skipped += 1;
    }
  }
}

console.log(
  `link-template-vite-modules: ok (junctions linked=${linked}, missing in workspace=${skipped})`,
);
