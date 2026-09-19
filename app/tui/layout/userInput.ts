import {
  BoxRenderable,
  type CliRenderer,
  type ScrollBoxRenderable,
  TextareaRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../../agent";
import { sessionMessages } from "../../store";
import type { ToolActivityEvent } from "../../types";
import { ACCENT, BASE_TEXT, DIM, ERROR } from "../constants";
import { composerRows, shutdown } from "../utils/tui.utils";
import {
  addQueuedUserMessageToSession,
  addUserMessageToSession,
  createStreamingMessage,
  type QueuedItem,
  removeQueuedChip,
  type ToolRow,
} from "./session";

type UserInputHandler = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  textarea: TextareaRenderable;
};

type ComposerText = UserInputHandler & { text: string };

const COMPOSER_MAX_LINES = 5;

const clampComposerLines = (lines: number): number =>
  Math.min(Math.max(lines, 1), COMPOSER_MAX_LINES);

let heightSyncQueued = false;

const scheduleComposerHeight = (textarea: TextareaRenderable): void => {
  if (heightSyncQueued) {
    return;
  }
  heightSyncQueued = true;
  queueMicrotask(() => {
    heightSyncQueued = false;
    if (textarea.isDestroyed) {
      return;
    }
    textarea.height = clampComposerLines(composerRows(textarea.plainText, textarea.width));
  });
};

type ComposerReading = { kind: "empty" } | { kind: "exit" } | { kind: "ready"; text: string };

const readComposer = (textarea: TextareaRenderable): ComposerReading => {
  const text = textarea.plainText.trim();
  if (!text) {
    return { kind: "empty" };
  }
  if (text === "/exit" || text === "/quit") {
    return { kind: "exit" };
  }
  return { kind: "ready", text };
};

const clearComposer = (textarea: TextareaRenderable): void => {
  textarea.setText("");
};

const queuedMessages: { text: string; item: QueuedItem }[] = [];
let busy = false;

type SendMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  textarea: TextareaRenderable;
  text: string;
  echoUserMessage: boolean;
  queuedItem?: QueuedItem;
};

const sendMessage = async ({
  session,
  renderer,
  textarea,
  text,
  echoUserMessage,
  queuedItem,
}: SendMessageArgs) => {
  if (echoUserMessage) {
    addUserMessageToSession({
      session,
      renderer,
      content: text,
    });
  }

  if (queuedItem) {
    removeQueuedChip({ renderer, item: queuedItem });
  }

  const live = createStreamingMessage({
    session,
    renderer,
    initialContent: "Thinking",
    fg: DIM,
    belowBlock: queuedItem?.block,
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

const processQueue = async ({ session, renderer, textarea }: UserInputHandler) => {
  while (queuedMessages.length > 0) {
    const next = queuedMessages.shift();
    if (next === undefined) {
      break;
    }
    await sendMessage({
      session,
      renderer,
      textarea,
      text: next.text,
      echoUserMessage: false,
      queuedItem: next.item,
    });
  }
};

const queueMessage = ({ session, renderer, textarea, text }: ComposerText) => {
  clearComposer(textarea);
  const item = addQueuedUserMessageToSession({ session, renderer, content: text });
  queuedMessages.push({ text, item });
  textarea.focus();
  renderer.requestRender();
};

const steerMessage = ({ session, renderer, textarea, text }: ComposerText) => {
  clearComposer(textarea);
  sessionMessages.push({ role: "user", content: text });
  addUserMessageToSession({ session, renderer, content: text });
  textarea.focus();
  renderer.requestRender();
};

const userInputSubmitHandler = async ({ session, renderer, textarea }: UserInputHandler) => {
  const input = readComposer(textarea);

  if (input.kind === "empty") {
    textarea.focus();
    return;
  }
  if (input.kind === "exit") {
    shutdown(renderer);
    return;
  }
  const text = input.text;
  if (busy) {
    steerMessage({ session, renderer, textarea, text });
    return;
  }

  clearComposer(textarea);
  renderer.requestRender();

  busy = true;
  try {
    await sendMessage({ session, renderer, textarea, text, echoUserMessage: true });
    await processQueue({ session, renderer, textarea });
  } finally {
    busy = false;
    textarea.focus();
  }
};

const userInputQueueHandler = ({ session, renderer, textarea }: UserInputHandler) => {
  const input = readComposer(textarea);

  if (input.kind === "empty") {
    return;
  }
  if (input.kind === "exit") {
    shutdown(renderer);
    return;
  }
  if (!busy) {
    void userInputSubmitHandler({ session, renderer, textarea });
    return;
  }

  queueMessage({ session, renderer, textarea, text: input.text });
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
    maxHeight: COMPOSER_MAX_LINES,
    wrapMode: "word",
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
  textarea.on("resize", () => scheduleComposerHeight(textarea));
  inputBox.add(textarea);

  renderer.keyInput.on("keypress", (key) => {
    if (textarea.isDestroyed || !textarea.focused) {
      return;
    }
    if (key.name === "tab" && !key.ctrl && !key.meta) {
      userInputQueueHandler({ session, renderer, textarea });
      return;
    }
    const isCtrlEnter = (key.name === "return" || key.name === "kpenter") && key.ctrl && !key.meta;
    if (isCtrlEnter && busy) {
      const input = readComposer(textarea);
      if (input.kind === "empty") {
        return;
      }
      if (input.kind === "exit") {
        shutdown(renderer);
        return;
      }
      key.preventDefault();
      steerMessage({ session, renderer, textarea, text: input.text });
    }
  });

  return { inputBox, textarea };
};
