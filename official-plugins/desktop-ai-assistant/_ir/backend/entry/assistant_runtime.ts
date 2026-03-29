export function buildGreeting(name: string): string {
  const normalized = String(name || "").trim() || "World";
  return `Hello, ${normalized}!`;
}
