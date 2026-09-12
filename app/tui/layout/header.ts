import { BoxRenderable, type CliRenderer, TextRenderable } from "@opentui/core";
import { DIM, VERSION, WHITE } from "../constants";

export type HeaderData = {
  model: string;
  effort: string;
  cwd: string;
  branch: string;
};

export const createHeader = (renderer: CliRenderer, data: HeaderData) => {
  const header = new BoxRenderable(renderer, {
    width: "auto",
    flexShrink: 0,
    flexDirection: "column",
    paddingLeft: 1,
    paddingRight: 1,
    border: true,
    borderColor: DIM,
    borderStyle: "single",
  });

  const title = new TextRenderable(renderer, {
    content: `Syntax  v${VERSION}`,
    fg: WHITE,
    flexShrink: 0,
  });
  header.add(title);

  header.add(
    new TextRenderable(renderer, {
      content: [data.model, data.effort].filter(Boolean).join(" · "),
      fg: DIM,
      flexShrink: 0,
    }),
  );
  header.add(
    new TextRenderable(renderer, {
      content: data.branch ? `${data.cwd}:${data.branch}` : data.cwd,
      fg: DIM,
      flexShrink: 0,
    }),
  );

  return header;
};
