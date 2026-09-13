import { appendFileSync } from "node:fs";
import { inspect } from "node:util";

export function debug(...args: unknown[]): void {
  const line = `${args
    .map((a) => (typeof a === "string" ? a : inspect(a, { depth: 5 })))
    .join(" ")}\n`;
  try {
    appendFileSync("debug.log", line);
  } catch {}
}
