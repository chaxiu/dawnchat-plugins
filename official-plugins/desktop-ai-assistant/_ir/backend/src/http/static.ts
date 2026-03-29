import { join, normalize } from "node:path";

function resolveStaticPath(webRoot: string, requestPath: string): string {
  const candidate = requestPath === "/" ? "/index.html" : requestPath;
  const normalized = normalize(candidate).replace(/^(\.\.[/\\])+/, "");
  return join(webRoot, normalized);
}

export async function resolveStaticResponse(webRoot: string, requestPath: string): Promise<Response | null> {
  const file = Bun.file(resolveStaticPath(webRoot, requestPath));
  if (await file.exists()) {
    return new Response(file);
  }
  const indexFile = Bun.file(join(webRoot, "index.html"));
  if (await indexFile.exists()) {
    return new Response(indexFile, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
  return null;
}
