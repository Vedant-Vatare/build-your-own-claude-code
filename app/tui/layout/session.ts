import { type CliRenderer, ScrollBoxRenderable, TextRenderable } from "@opentui/core";

export const createSession = (renderer: CliRenderer) => {
  return new ScrollBoxRenderable(renderer, {
    flexGrow: 1,
    width: "100%",
    stickyScroll: true,
    stickyStart: "bottom",
    contentOptions: { justifyContent: "flex-end" },
  });
};

type SessionMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  content: string;
  fg?: string;
};

export const addMessageToSession = ({ session, renderer, content, fg }: SessionMessageArgs) => {
  session.add(
    new TextRenderable(renderer, {
      content,
      ...(fg ? { fg } : {}),
      flexShrink: 0,
    }),
  );
  renderer.requestRender();
};
