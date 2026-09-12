import { execSync } from "node:child_process";
import { BoxRenderable, createCliRenderer } from "@opentui/core";
import { createHeader } from "./layout/header";
import { createSession } from "./layout/session";
import { createUserInput } from "./layout/userInput";

export const startTui = async () => {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });

  const model = process.env.MODEL ?? "";
  const effort = process.env.EFFORT ?? "";
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

  const root = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
  });

  const header = createHeader(renderer, { model, effort, cwd, branch });

  const session = createSession(renderer);

  const { inputBox, input } = createUserInput(session, renderer);

  root.add(header);
  root.add(session);
  root.add(inputBox);
  renderer.root.add(root);
  input.focus();
};
