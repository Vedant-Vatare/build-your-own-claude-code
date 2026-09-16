import { BoxRenderable, type CliRenderer, fg, TextRenderable, t } from "@opentui/core";
import { ACCENT, BASE_TEXT, DIM, VERSION } from "../constants";

export type HeaderData = {
  model: string;
  effort: string;
  cwd: string;
  branch: string;
};

export const truncatePath = (fullPath: string, maxLen = 48): string => {
  if (!fullPath || fullPath.length <= maxLen) return fullPath;

  const parts = fullPath.split(/[\\/]/).filter(Boolean);
  const last = parts.at(-1) ?? fullPath;

  if (last.length + 3 >= maxLen) return `...${last.slice(-(maxLen - 3))}`;

  const head = fullPath.slice(0, maxLen - 3 - last.length);
  return `${head}...${last}`;
};

export const createHeader = (renderer: CliRenderer, data: HeaderData) => {
  const header = new BoxRenderable(renderer, {
    width: "auto",
    alignSelf: "flex-start",
    flexShrink: 0,
    flexDirection: "column",
    paddingLeft: 1,
    paddingRight: 1,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 0,
    marginLeft: 0,
    marginBottom: 0,
    border: true,
    borderColor: DIM,
    borderStyle: "single",
  });

  const title = new TextRenderable(renderer, {
    content: t`${fg(ACCENT)("Syntax")}  ${fg(DIM)(`(v${VERSION})`)}`,
    flexShrink: 0,
  });
  header.add(title);

  const modelValue = [data.model, data.effort].filter(Boolean).join(" · ") || "no model set";
  header.add(
    new TextRenderable(renderer, {
      content: t`${fg(DIM)(`${"model:".padEnd(10)}  `)}${fg(BASE_TEXT)(modelValue)}`,
      flexShrink: 0,
    }),
  );
  const shortCwd = truncatePath(data.cwd);
  const directoryValue = data.branch ? `${shortCwd}:${data.branch}` : shortCwd;
  header.add(
    new TextRenderable(renderer, {
      content: t`${fg(DIM)(`${"directory:".padEnd(10)}  `)}${fg(BASE_TEXT)(directoryValue)}`,
      flexShrink: 0,
    }),
  );

  return header;
};
