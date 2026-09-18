import {
  BoxRenderable,
  type CliRenderer,
  type ScrollBoxRenderable,
  TextareaRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../../agent";
import type { ToolActivityEvent } from "../../types";
import { ACCENT, BASE_TEXT, DIM, ERROR } from "../constants";
import { shutdown } from "../utils/tui.utils";
import { addUserMessageToSession, createStreamingMessage, type ToolRow } from "./session";

type UserInputHandler = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  textarea: TextareaRenderable;
};

const MAX_COMPOSER_LINES = 8;

const clampComposerLines = (lines: number): number =>
  Math.min(Math.max(lines, 1), MAX_COMPOSER_LINES);

const scheduleComposerHeight = (() => {
  let queued = false;
  return (textarea: TextareaRenderable): void => {
    if (queued) {
      return;
    }
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (textarea.isDestroyed) {
        return;
      }
      textarea.height = clampComposerLines(Math.max(textarea.lineCount, textarea.virtualLineCount));
    });
  };
})();

const userInputSubmitHandler = async ({ session, renderer, textarea }: UserInputHandler) => {
  const text = textarea.plainText.trim();

  textarea.setText("");
  scheduleComposerHeight(textarea);
  renderer.requestRender();
  if (!text) {
    textarea.focus();
    return;
  }
  if (text === "/exit" || text === "/quit") {
    shutdown(renderer);
    return;
  }

  addUserMessageToSession({
    session,
    renderer,
    content: `${text}`,
  });

  const live = createStreamingMessage({
    session,
    renderer,
    initialContent: "Thinking",
    fg: DIM,
  });

  let producedOutput = false;
  const toolRows = new Map<string, ToolRow>();

  const failInflightTools = (): void => {
    for (const row of toolRows.values()) {
      row.setToolState("failed");
    }
    toolRows.clear();
  };

  try {
    const onTextStream = (delta: string) => {
      producedOutput = true;
      live.appendText(delta);
    };

    const onToolUse = (event: ToolActivityEvent) => {
      producedOutput = true;
      let toolRow = toolRows.get(event.id);
      if (!toolRow) {
        toolRow = live.addToolRow(event.name, event.args);
        toolRows.set(event.id, toolRow);
      }
      if (event.state === "succeeded" || event.state === "failed") {
        toolRows.delete(event.id);
      }
      toolRow.setToolState(event.state, event.error);
    };

    const agentResponse = await agent({ prompt: text, onTextStream, onToolUse });

    toolRows.clear();
    if (!agentResponse && !producedOutput) {
      live.appendText("(no response)");
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    failInflightTools();
    live.appendText(errorMessage, ERROR);
  } finally {
    textarea.focus();
  }
};

export const createUserInput = (session: ScrollBoxRenderable, renderer: CliRenderer) => {
  const inputBox = new BoxRenderable(renderer, {
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    border: ["top", "bottom"],
    borderStyle: "single",
    borderColor: DIM,
    marginLeft: 1,
    marginRight: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });
  inputBox.add(new TextRenderable(renderer, { content: "❯ ", fg: ACCENT }));

  const textarea = new TextareaRenderable(renderer, {
    flexGrow: 1,
    height: 1,
    minHeight: 1,
    maxHeight: MAX_COMPOSER_LINES,
    textColor: BASE_TEXT,
    cursorStyle: { style: "default" },
    keyBindings: [
      { name: "return", action: "submit" },
      { name: "kpenter", action: "submit" },
      { name: "return", ctrl: true, action: "submit" },
      { name: "kpenter", ctrl: true, action: "submit" },
      { name: "linefeed", action: "submit" },
      { name: "return", shift: true, action: "newline" },
      { name: "kpenter", shift: true, action: "newline" },
      { name: "return", meta: true, action: "newline" },
      { name: "kpenter", meta: true, action: "newline" },
    ],
    onSubmit() {
      void userInputSubmitHandler({ session, renderer, textarea });
    },
  });
  textarea.on("line-info-change", () => scheduleComposerHeight(textarea));
  inputBox.add(textarea);

  return { inputBox, textarea };
};
