import * as ELKModule from "elkjs/lib/elk.bundled.js";

export type ElkLayoutNode = {
  id: string;
  x?: number;
  y?: number;
};

export type ElkLayoutResult = {
  children?: ElkLayoutNode[];
};

export type ElkLayoutEngine = {
  layout: (graph: unknown) => Promise<ElkLayoutResult>;
};

type ElkConstructor = new (...args: any[]) => ElkLayoutEngine;

function resolveElkConstructor(): ElkConstructor {
  const candidate = ((ELKModule as any).default ?? ELKModule) as ElkConstructor | undefined;
  if (!candidate) {
    throw new Error("Failed to resolve ELK constructor from elk.bundled.js");
  }
  return candidate;
}

export function createBrowserElkLayoutEngine(): ElkLayoutEngine {
  // We intentionally bind to elk.bundled.js here because the package root can
  // resolve to a Node-oriented entry during Vite prebundle, which breaks browser previews.
  const ELK = resolveElkConstructor();
  return new ELK();
}
