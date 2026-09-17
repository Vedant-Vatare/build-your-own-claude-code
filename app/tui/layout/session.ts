import {
  BoxRenderable,
  type CliRenderer,
  type RGBA,
  ScrollBoxRenderable,
  TextAttributes,
  TextRenderable,
} from "@opentui/core";

import type { ToolActivityState } from "../../types";
import { ACCENT, BASE_TEXT, DIM, ERROR, GREEN, WHITE } from "../constants";
import { describeToolCall } from "../utils/tools.utils";

export const createSession = (renderer: CliRenderer) => {
  return new ScrollBoxRenderable(renderer, {
    flexGrow: 1,
    width: "100%",
    stickyScroll: true,
    stickyStart: "bottom",
    contentOptions: { justifyContent: "flex-end", gap: 1 },
    marginLeft: 1,
    marginRight: 1,
    paddingLeft: 0,
    paddingRight: 0,
  });
};

type SessionMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  content: string;
  fg?: string | RGBA;
};

export const addMessageToSession = ({ session, renderer, content, fg }: SessionMessageArgs) => {
  const wrapper = new BoxRenderable(renderer, {
    width: "100%",
    flexShrink: 0,
    paddingLeft: 1,
    paddingRight: 1,
  });
  wrapper.add(
    new TextRenderable(renderer, {
      content,
      ...(fg ? { fg } : {}),
      flexShrink: 0,
      wrapMode: "word",
    }),
  );
  session.add(wrapper);
  renderer.requestRender();
};

type StreamingMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  initialContent?: string;
  fg?: string | RGBA;
};

export type ToolRow = {
  setToolState: (state: ToolActivityState, error?: string) => void;
};

export type StreamingMessage = {
  appendText: (delta: string, fg?: string | RGBA) => void;
  addToolRow: (name: string, args: string) => ToolRow;
};

const TOOL_DOT = "•";
const DOT_PULSE_MS = 600;
const MAX_ARGS_CHARS = 80;

const compactArgs = (args: string): string => {
  const singleLine = args.replace(/\s+/g, " ").trim();
  if (singleLine.length <= MAX_ARGS_CHARS) return singleLine;
  return `${singleLine.slice(0, MAX_ARGS_CHARS - 3)}...`;
};

const unrefTimer = (timer: ReturnType<typeof setInterval>): void => {
  const ref = timer as unknown as { unref?: () => void };
  ref.unref?.();
};

export const createStreamingMessage = ({
  session,
  renderer,
  initialContent = "thinking...",
  fg = DIM,
}: StreamingMessageArgs): StreamingMessage => {
  const wrapper = new BoxRenderable(renderer, {
    width: "100%",
    flexShrink: 0,
    flexDirection: "column",
    gap: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });
  session.add(wrapper);

  let currentText: { node: TextRenderable; fg: string | RGBA; empty: boolean } | null = null;

  const openTextBlock = (blockFg: string | RGBA): TextRenderable => {
    const node = new TextRenderable(renderer, {
      fg: blockFg,
      flexShrink: 0,
      wrapMode: "word",
    });
    wrapper.add(node);
    return node;
  };

  if (initialContent) {
    wrapper.add(
      new TextRenderable(renderer, {
        content: initialContent,
        fg,
        flexShrink: 0,
        wrapMode: "word",
      }),
    );
  }
  renderer.requestRender();

  const sealTextBlock = (): void => {
    if (!currentText) return;
    const full = currentText.node.plainText;
    const trimmed = full.replace(/\s+$/, "");
    if (trimmed.length !== full.length) {
      currentText.node.content = trimmed;
    }
    currentText = null;
  };

  const appendText = (delta: string, blockFg: string | RGBA = BASE_TEXT): void => {
    if (!delta) return;
    if (!currentText || currentText.fg !== blockFg) {
      sealTextBlock();
      currentText = { node: openTextBlock(blockFg), fg: blockFg, empty: true };
    }
    if (currentText.empty) {
      if (delta.trim() === "") return;
      currentText.empty = false;
    }
    currentText.node.add(delta);
    renderer.requestRender();
  };

  const addToolRow = (name: string, args: string): ToolRow => {
    sealTextBlock();
    const { label, detail } = describeToolCall(name, args);
    const row = new BoxRenderable(renderer, {
      flexDirection: "row",
      width: "100%",
      flexShrink: 0,
    });
    const toolIndicator = new TextRenderable(renderer, {
      content: TOOL_DOT,
      fg: DIM,
      flexShrink: 0,
    });
    const toolName = new TextRenderable(renderer, {
      content: `  ${label.padEnd(5)} `,
      fg: BASE_TEXT,
      attributes: TextAttributes.BOLD,
      flexShrink: 0,
    });
    const toolDetail = new TextRenderable(renderer, {
      content: compactArgs(detail),
      fg: BASE_TEXT,
      flexShrink: 0,
    });
    row.add(toolIndicator);
    row.add(toolName);
    row.add(toolDetail);
    wrapper.add(row);

    let pulse: ReturnType<typeof setInterval> | null = null;
    let bright = false;

    const paintDot = (color: string | RGBA): void => {
      toolIndicator.fg = color;
      renderer.requestRender();
    };
    const stopPulse = (): void => {
      if (pulse) {
        clearInterval(pulse);
        pulse = null;
      }
    };
    const startPulse = (): void => {
      stopPulse();
      bright = false;
      paintDot(DIM);
      pulse = setInterval(() => {
        bright = !bright;
        paintDot(bright ? WHITE : DIM);
      }, DOT_PULSE_MS);
      unrefTimer(pulse);
    };

    startPulse();

    const setToolState = (state: ToolActivityState, error?: string): void => {
      stopPulse();
      if (state === "succeeded") {
        paintDot(GREEN);
      } else if (state === "failed") {
        paintDot(ERROR);
        if (error) {
          const errorBlock = openTextBlock(BASE_TEXT);
          errorBlock.add(error);
          currentText = null;
          renderer.requestRender();
        }
      } else if (state === "running") {
        startPulse();
      } else {
        paintDot(DIM);
      }
    };

    return { setToolState };
  };

  return {
    appendText,
    addToolRow,
  };
};

type UserMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  content: string;
  fg?: string | RGBA;
};

export const addUserMessageToSession = ({
  session,
  renderer,
  content,
  fg = BASE_TEXT,
}: UserMessageArgs) => {
  const wrapper = new BoxRenderable(renderer, {
    flexDirection: "row",
    width: "100%",
    flexShrink: 0,
  });
  wrapper.add(
    new BoxRenderable(renderer, {
      width: 1,
      flexShrink: 0,
      backgroundColor: ACCENT,
    }),
  );
  const body = new BoxRenderable(renderer, {
    flexGrow: 1,
    flexShrink: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });
  body.add(
    new TextRenderable(renderer, {
      content,
      fg,
      flexShrink: 0,
      wrapMode: "word",
    }),
  );
  wrapper.add(body);
  session.add(wrapper);
  renderer.requestRender();
};
