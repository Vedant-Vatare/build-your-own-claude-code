import { BoxRenderable, createCliRenderer } from "@opentui/core";
import { createHeader } from "./layout/header";
import { createSession } from "./layout/session";
import { createUserInput } from "./layout/userInput";
import { createWorkingStatus } from "./layout/workingStatus";
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

  const working = createWorkingStatus(renderer);
  const { composer, textarea } = createUserInput(session, renderer, working);

  root.add(header);
  root.add(session);
  root.add(composer);
  renderer.root.add(root);
  textarea.focus();
};
