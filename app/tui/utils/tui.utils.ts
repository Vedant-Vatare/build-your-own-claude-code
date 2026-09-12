import { execSync } from "node:child_process";
import type { CliRenderer } from "@opentui/core";

let shuttingDown = false;
export const shutdown = (renderer: CliRenderer) => {
  if (shuttingDown) return;
  shuttingDown = true;
  renderer.destroy();
};

export const getInitialModelInfo = () => {
  const model = process.env.MODEL ?? "";
  const effort = process.env.EFFORT ?? "";
  return { model, effort };
};

export const getShellInfo = () => {
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
