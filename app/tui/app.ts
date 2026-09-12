import { BoxRenderable, createCliRenderer } from "@opentui/core";
import { createHeader } from "./layout/header";
import { createSession } from "./layout/session";
import { createUserInput } from "./layout/userInput";
import { getInitialModelInfo, getShellInfo } from "./utils/tui.utils";

export const startTui = async () => {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });

  const { model, effort } = getInitialModelInfo();
  const { cwd, branch } = getShellInfo();

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
