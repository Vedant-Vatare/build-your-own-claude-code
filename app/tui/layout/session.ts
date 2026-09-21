import {
  BoxRenderable,
  type CliRenderer,
  type RGBA,
  ScrollBoxRenderable,
  TextAttributes,
  TextRenderable,
} from "@opentui/core";

import type { ToolActivityState } from "../../types";
import { ACCENT, BASE_TEXT, BLACK, DIM, ERROR, GREEN, WHITE } from "../constants";
import { createMarkdownBlock, type MarkdownBlock, scheduleMarkdownRepaint } from "../markdown";
import { describeToolCall } from "../utils/tools.utils";
import { paragraphTextRenderer } from "../utils/tui.utils";

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
  wrapper.add(createMarkdownBlock(renderer, { content, ...(fg ? { fg } : {}) }));
  session.add(wrapper);
  renderer.requestRender();
  scheduleMarkdownRepaint(renderer);
};

type StreamingMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  initialContent?: string;
  fg?: string | RGBA;
  belowBlock?: BoxRenderable;
};

export type ToolRow = {
  setToolState: (state: ToolActivityState, error?: string) => void;
};

export type StreamingMessage = {
  appendText: (delta: string, fg?: string | RGBA) => void;
  addToolRow: (name: string, args: string) => ToolRow;
  finalize: () => void;
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
  belowBlock,
}: StreamingMessageArgs): StreamingMessage => {
  const wrapper = new BoxRenderable(renderer, {
    width: "100%",
    flexShrink: 0,
    flexDirection: "column",
    gap: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });
  if (belowBlock) {
    const siblings = session.getChildren();
    const blockIndex = siblings.indexOf(belowBlock);
    session.add(wrapper, blockIndex === -1 ? undefined : blockIndex + 1);
  } else {
    session.add(wrapper);
  }

  let currentText: { node: MarkdownBlock; fg: string | RGBA; empty: boolean } | null = null;

  const openTextBlock = (blockFg: string | RGBA): MarkdownBlock => {
    const node = createMarkdownBlock(renderer, { fg: blockFg, streaming: true });
    wrapper.add(node);
    return node;
  };

  if (initialContent) {
    wrapper.add(createMarkdownBlock(renderer, { content: initialContent, fg }));
  }
  renderer.requestRender();

  const sealTextBlock = (): void => {
    if (!currentText) return;
    const full = currentText.node.content;
    const trimmed = full.replace(/\s+$/, "");
    if (trimmed.length !== full.length) {
      currentText.node.content = trimmed;
    }
    currentText.node.streaming = false;
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
    currentText.node.content += delta;
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
          errorBlock.content += error;
          errorBlock.streaming = false;
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
    finalize: () => {
      sealTextBlock();
      scheduleMarkdownRepaint(renderer);
    },
  };
};

export const addUserMessageToSession = ({
  session,
  renderer,
  content,
  fg = BASE_TEXT,
}: SessionMessageArgs) => {
  session.add(userMessageRow(renderer, content, fg));
  renderer.requestRender();
};

export type QueuedItem = {
  block: BoxRenderable;
  chip: BoxRenderable;
};

export const addQueuedUserMessageToSession = ({
  session,
  renderer,
  content,
}: Omit<SessionMessageArgs, "fg">): QueuedItem => {
  const block = new BoxRenderable(renderer, {
    flexDirection: "column",
    width: "100%",
    flexShrink: 0,
  });
  const chipRow = new BoxRenderable(renderer, {
    flexDirection: "row",
    flexShrink: 0,
    paddingTop: 1,
    paddingBottom: 1,
  });
  chipRow.add(
    new TextRenderable(renderer, {
      content: " QUEUED ",
      fg: BLACK,
      bg: ACCENT,
      attributes: TextAttributes.BOLD,
      flexShrink: 0,
    }),
  );
  block.add(chipRow);
  block.add(userMessageRow(renderer, content, BASE_TEXT));
  session.add(block);
  renderer.requestRender();
  return { block, chip: chipRow };
};

export const removeQueuedChip = ({
  renderer,
  item,
}: {
  renderer: CliRenderer;
  item: QueuedItem;
}): void => {
  item.block.remove(item.chip);
  renderer.requestRender();
};

const userMessageRow = (renderer: CliRenderer, content: string, fg: string | RGBA) => {
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
    paragraphTextRenderer(renderer, {
      content,
      fg,
    }),
  );
  wrapper.add(body);
  return wrapper;
};
