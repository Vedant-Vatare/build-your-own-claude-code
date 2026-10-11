import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SkillSummary = {
  name: string;
  description: string;
  path: string;
};

const SKILL_DIRECTORY = ".agents/skills";

const readFrontMatter = (content: string): Pick<SkillSummary, "name" | "description"> | null => {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;

  const closingLine = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closingLine === -1) return null;

  const fields: Partial<Record<"name" | "description", string>> = {};

  for (const line of lines.slice(1, closingLine)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim();
    if (key !== "name" && key !== "description") continue;

    let value = line.slice(colon + 1).trim();
    const hasDoubleQuotes = value.startsWith('"') && value.endsWith('"');
    const hasSingleQuotes = value.startsWith("'") && value.endsWith("'");
    if (hasDoubleQuotes || hasSingleQuotes) value = value.slice(1, -1);
    fields[key] = value;
  }

  const { name, description } = fields;
  return name && description ? { name, description } : null;
};

export const getAvailableSkills = (cwd: string = process.cwd()): SkillSummary[] => {
  const roots = [resolve(cwd, SKILL_DIRECTORY), resolve(homedir(), SKILL_DIRECTORY)];
  const skills = new Map<string, SkillSummary>();

  for (const root of roots) {
    let entries: string[];
    try {
      entries = readdirSync(root);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const skillFile = join(root, entry, "SKILL.md");
      try {
        if (!statSync(skillFile).isFile()) continue;
        const metadata = readFrontMatter(readFileSync(skillFile, "utf8"));
        if (!metadata) continue;
        if (!skills.has(metadata.name)) {
          skills.set(metadata.name, {
            ...metadata,
            path: skillFile,
          });
        }
      } catch {}
    }
  }

  return [...skills.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const formatSkillsForPrompt = (skills: SkillSummary[]): string => {
  if (skills.length === 0) return "No skills were discovered.";
  return skills
    .map(({ name, description, path }) => `- ${name}: ${description} (SKILL.md: ${path})`)
    .join("\n");
};
