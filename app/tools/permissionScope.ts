import { execSync } from "node:child_process";

export const resolveScopeDir = (cwd: string): string => {
  try {
    const root = execSync("git rev-parse --show-toplevel", { cwd, encoding: "utf-8" }).trim();
    if (root) return root.replace(/\\/g, "/");
  } catch {
    // Outside a Git repository, scope saved rules to the current directory.
  }
  return cwd.replace(/\\/g, "/");
};
