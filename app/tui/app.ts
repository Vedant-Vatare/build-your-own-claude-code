import { execSync } from "node:child_process";
import {
  BoxRenderable,
  createCliRenderer,
  InputRenderable,
  RGBA,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../agent";
import { ACCENT, DIM, ERROR, WHITE } from "./constants";
import { createHeader } from "./layout/header";
import { addMessageToSession, createSession } from "./layout/session";

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

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    renderer.destroy();
  };

  const root = new BoxRenderable(renderer, {
    width: "100%",
    height: "100%",
    flexDirection: "column",
  });

  const header = createHeader(renderer, { model, effort, cwd, branch });

  const session = createSession(renderer);

  const inputBox = new BoxRenderable(renderer, {
    height: 3,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    border: ["top", "bottom"],
    borderStyle: "single",
    borderColor: DIM,
    marginLeft: 2,
    marginRight: 2,
    paddingLeft: 1,
    paddingRight: 1,
  });
  inputBox.add(new TextRenderable(renderer, { content: "❯ ", fg: WHITE }));
  const input = new InputRenderable(renderer, {
    flexGrow: 1,
    textColor: RGBA.defaultForeground(),
    cursorStyle: { style: "default" },
  });
  inputBox.add(input);

  root.add(header);
  root.add(session);
  root.add(inputBox);
  renderer.root.add(root);
  input.focus();

  let busy = false;

  input.on("enter", async (value: string) => {
    const text = value.trim();
    input.value = "";
    renderer.requestRender();
    if (!text) {
      input.focus();
      return;
    }
    if (text === "/exit" || text === "/quit") {
      shutdown();
      return;
    }

    if (busy) {
      addMessageToSession({
        session,
        renderer,
        content: "Still working, wait for the current response.",
      });
      input.focus();
      return;
    }

    busy = true;

    addMessageToSession({
      session,
      renderer,
      content: `❯ ${text}`,
      fg: ACCENT,
    });
    try {
      const agentResponse = await agent(text);
      if (agentResponse) {
        addMessageToSession({
          session,
          renderer,
          content: agentResponse,
          fg: WHITE,
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addMessageToSession({
        session,
        renderer,
        content: errorMessage,
        fg: ERROR,
      });
    } finally {
      busy = false;
      input.focus();
    }
  });
};
