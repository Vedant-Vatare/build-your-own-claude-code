import { execSync } from "node:child_process";
import {
  BoxRenderable,
  createCliRenderer,
  InputRenderable,
  RGBA,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../agent";
import { ACCENT, DIM, ERROR, WHITE } from "./constants";
import { createHeader } from "./layout/header";

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

  const transcript = new ScrollBoxRenderable(renderer, {
    flexGrow: 1,
    width: "100%",
    stickyScroll: true,
    stickyStart: "bottom",
    contentOptions: { justifyContent: "flex-end" },
  });
  const say = (content: string, fg?: string) => {
    transcript.add(
      new TextRenderable(renderer, {
        content,
        ...(fg ? { fg } : {}),
        flexShrink: 0,
      }),
    );
    renderer.requestRender();
  };

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
  root.add(transcript);
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
    if (text === "/help") {
      say("Commands: /help  /exit   Ctrl+C quits", DIM);
      input.focus();
      return;
    }
    if (busy) {
      say("Still working, wait for the current response.", DIM);
      input.focus();
      return;
    }

    busy = true;
    say(`❯ ${text}`, ACCENT);
    try {
      const out = await agent(text);
      if (out) say(String(out));
    } catch (e) {
      say(e instanceof Error ? e.message : String(e), ERROR);
    } finally {
      busy = false;
      input.focus();
    }
  });
};
