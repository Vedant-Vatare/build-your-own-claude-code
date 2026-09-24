import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { PermissionAction, PermissionRule } from "./permissionRules";

type DirRules = Partial<Record<string, Record<string, PermissionAction>>>;

type PermissionFile = {
  version: 1;
  dirs: Record<string, DirRules>;
};

const storeFile = (): string => {
  const home = process.env.SYNTAX_HOME ?? join(homedir(), ".syntax");
  return join(home, "permissions.json");
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readFile = (): PermissionFile => {
  const fallback: PermissionFile = { version: 1, dirs: {} };
  try {
    if (!existsSync(storeFile())) return fallback;
    const parsed = JSON.parse(readFileSync(storeFile(), "utf-8")) as Partial<PermissionFile>;
    if (!isRecord(parsed) || !isRecord(parsed.dirs)) return fallback;

    const dirs: PermissionFile["dirs"] = {};
    for (const [scope, rawTools] of Object.entries(parsed.dirs)) {
      if (!isRecord(rawTools)) continue;
      const tools: DirRules = {};
      for (const [tool, rawRules] of Object.entries(rawTools)) {
        if (!isRecord(rawRules)) continue;
        const rules: Record<string, PermissionAction> = {};
        for (const [pattern, action] of Object.entries(rawRules)) {
          if (isAction(action)) rules[pattern] = action;
        }
        tools[tool] = rules;
      }
      dirs[scope] = tools;
    }
    return { version: 1, dirs };
  } catch {
    return fallback;
  }
};

const isAction = (value: unknown): value is PermissionAction =>
  value === "allow" || value === "ask" || value === "deny";

export const loadUserRules = (tool: string, scopeDir: string): PermissionRule[] => {
  const entry = readFile().dirs[scopeDir]?.[tool.toLowerCase()] ?? {};
  const rules: PermissionRule[] = [];
  for (const [pattern, action] of Object.entries(entry)) {
    if (isAction(action)) rules.push({ pattern, action, source: "user" });
  }
  return rules;
};

export const saveAlwaysAllow = (tool: string, scopeDir: string, matchText: string): void => {
  const path = storeFile();
  const data = readFile();
  const dir = data.dirs[scopeDir] ?? {};
  const key = tool.toLowerCase();
  dir[key] = { ...(dir[key] ?? {}), [matchText]: "allow" };
  data.dirs[scopeDir] = dir;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  } catch {}
};
