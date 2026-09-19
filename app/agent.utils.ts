import { execSync } from "node:child_process";

export type ShellInfo = {
  cwd: string;
  branch: string;
};

export const getShellInfo = (): ShellInfo => {
  const cwd = process.cwd();
  let branch = "";
  try {
    branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    branch = "";
  }
  return { cwd, branch };
};

export const isGitRepo = (cwd: string = process.cwd()): boolean => {
  try {
    const out = execSync("git rev-parse --is-inside-work-tree", {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out === "true";
  } catch {
    return false;
  }
};
