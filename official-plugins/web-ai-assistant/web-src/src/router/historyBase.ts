/**
 * DawnChat 站点运行时会在 HTML 中注入 `<base href="/sites/<public_slug>/">` 或
 * `/my-sites/<slug>/`，以便静态资源解析到正确前缀。
 * Vue Router 的 history base 必须与之一致，否则在子路径下无法匹配 `/views/...`。
 *
 * 本地 / Vite 预览下常会存在相对 `<base href=".">` 等：若按当前页 URL 解析会得到
 * `/views/...` 这种错误 base，导致 HMR 深链直接 “View unavailable”。因此仅在路径
 * 明显为站点托管前缀时才读取 `<base>`。
 */
function normalizeViteBase(base: string): string {
  const b = String(base ?? "/").trim();
  if (b === "./" || b === "." || b === "") {
    return "/";
  }
  return b.endsWith("/") ? b : `${b}/`;
}

function isPublishedSitesPath(pathname: string): boolean {
  return pathname.startsWith("/sites/") || pathname.startsWith("/my-sites/");
}

export function resolveSitesHistoryBase(): string {
  if (typeof window === "undefined") {
    return normalizeViteBase(import.meta.env.BASE_URL);
  }

  const path = window.location.pathname;

  if (!isPublishedSitesPath(path)) {
    return normalizeViteBase(import.meta.env.BASE_URL);
  }

  const raw = document.querySelector("base")?.getAttribute("href")?.trim();
  if (!raw) {
    return normalizeViteBase(import.meta.env.BASE_URL);
  }

  try {
    const resolved = new URL(raw, window.location.href);
    let basePath = resolved.pathname;
    if (!basePath.endsWith("/")) {
      basePath += "/";
    }
    return basePath;
  } catch {
    return normalizeViteBase(import.meta.env.BASE_URL);
  }
}
