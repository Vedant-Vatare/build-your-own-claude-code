import { BoxRenderable, createCliRenderer } from "@opentui/core";
import { debug } from "../debug";
import { createHeader } from "./layout/header";
import { createSession } from "./layout/session";
import { createUserInput } from "./layout/userInput";
import { createWorkingStatus } from "./layout/workingStatus";
import { getInitialModelInfo, getShellInfo } from "./utils/tui.utils";

export const startTui = async () => {
  const renderer = await createCliRenderer({ exitOnCtrlC: false });
  renderer.on("selection", (selection) => {
    const selectedText = selection.getSelectedText();
    if (selectedText.trim()) {
      const copied = renderer.copyToClipboardOSC52(selectedText);
      if (!copied) debug("clipboard copy (OSC 52) failed for selection");
    }
  });

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
