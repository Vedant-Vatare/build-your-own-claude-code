import { type CliRenderer, type TextOptions, TextRenderable } from "@opentui/core";
import { getShellInfo as getSharedShellInfo } from "../../agent.utils";

let shuttingDown = false;
export const shutdown = (renderer: CliRenderer) => {
  if (shuttingDown) return;
  shuttingDown = true;
  renderer.destroy();
};

export const getInitialModelInfo = () => {
  const model = process.env.MODEL ?? "";
  const effort = process.env.EFFORT ?? "";
  return { model, effort };
};

export const getShellInfo = () => getSharedShellInfo();

export const paragraphTextRenderer = (
  renderer: CliRenderer,
  options: TextOptions,
): TextRenderable => {
  return new TextRenderable(renderer, { flexShrink: 0, wrapMode: "word", ...options });
};

export const composerRows = (text: string, boxWidth: number): number => {
  const lines = text.split("\n");
  if (boxWidth <= 0) {
    return lines.length;
  }
  let rows = 0;
  for (const line of lines) {
    rows += Math.max(1, Math.ceil(Bun.stringWidth(line) / boxWidth));
  }
  return rows;
};
