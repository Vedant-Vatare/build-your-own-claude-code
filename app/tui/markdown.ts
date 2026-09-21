import * as Core from "@opentui/core";
import { type CliRenderer, type Renderable, type RGBA, SyntaxStyle } from "@opentui/core";
import { ACCENT } from "./constants";

export type MarkdownBlock = Renderable & {
  content: string;
  streaming: boolean;
};

type MarkdownBlockOptions = {
  width?: string | number;
  content?: string;
  syntaxStyle: SyntaxStyle;
  fg?: string | RGBA;
  conceal?: boolean;
  streaming?: boolean;
};

type MarkdownCtor = new (renderer: CliRenderer, options: MarkdownBlockOptions) => MarkdownBlock;

const MarkdownRenderableCtor = (Core as unknown as { MarkdownRenderable: MarkdownCtor })
  .MarkdownRenderable;

let cachedStyle: SyntaxStyle | null = null;

export const markdownStyle = (): SyntaxStyle => {
  if (!cachedStyle) {
    cachedStyle = SyntaxStyle.fromStyles({
      "markup.heading": { fg: ACCENT, bold: true },
      "markup.heading.1": { fg: ACCENT, bold: true },
      "markup.heading.2": { fg: ACCENT, bold: true },
      "markup.heading.3": { fg: ACCENT, bold: true },
      "markup.heading.4": { fg: ACCENT, bold: true },
      "markup.heading.5": { fg: ACCENT, bold: true },
      "markup.heading.6": { fg: ACCENT, bold: true },
      "markup.bold": { bold: true },
      "markup.strong": { bold: true },
      "markup.italic": { italic: true },
      "markup.quote": { fg: "#8B949E", italic: true },
      "markup.raw": { fg: "#A5D6FF" },
      "markup.raw.block": { fg: "#A5D6FF" },
      "markup.link": { fg: "#58A6FF", underline: true },
      "markup.link.url": { fg: "#58A6FF", underline: true },
      keyword: { fg: "#FF7B72", bold: true },
      "keyword.operator": { fg: "#FF7B72" },
      string: { fg: "#A5D6FF" },
      comment: { fg: "#8B949E", italic: true },
      number: { fg: "#79C0FF" },
      boolean: { fg: "#79C0FF" },
      constant: { fg: "#79C0FF" },
      function: { fg: "#D2A8FF" },
      "function.call": { fg: "#D2A8FF" },
      type: { fg: "#FFA657" },
      constructor: { fg: "#FFA657" },
      "variable.member": { fg: "#79C0FF" },
      property: { fg: "#79C0FF" },
      operator: { fg: "#FF7B72" },
    });
  }
  return cachedStyle;
};

export const createMarkdownBlock = (
  renderer: CliRenderer,
  options: { content?: string; fg?: string | RGBA; streaming?: boolean },
): MarkdownBlock =>
  new MarkdownRenderableCtor(renderer, {
    width: "100%",
    content: options.content ?? "",
    syntaxStyle: markdownStyle(),
    ...(options.fg ? { fg: options.fg } : {}),
    conceal: true,
    ...(options.streaming !== undefined ? { streaming: options.streaming } : {}),
  });

export const scheduleMarkdownRepaint = (renderer: CliRenderer): void => {
  const timer = setTimeout(() => {
    try {
      renderer.requestRender();
    } catch {}
  }, 500);
  (timer as unknown as { unref?: () => void }).unref?.();
};
