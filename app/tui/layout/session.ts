import {
  BoxRenderable,
  type CliRenderer,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { ACCENT, DIM, WHITE } from "../constants";

export const createSession = (renderer: CliRenderer) => {
  return new ScrollBoxRenderable(renderer, {
    flexGrow: 1,
    width: "100%",
    stickyScroll: true,
    stickyStart: "bottom",
    contentOptions: { justifyContent: "flex-end", gap: 2 },
    marginLeft: 2,
    marginRight: 2,
    paddingLeft: 1,
    paddingRight: 1,
  });
};

type SessionMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  content: string;
  fg?: string;
};

export const addMessageToSession = ({ session, renderer, content, fg }: SessionMessageArgs) => {
  const wrapper = new BoxRenderable(renderer, {
    width: "100%",
    flexShrink: 0,
    paddingLeft: 2,
    paddingRight: 1,
  });
  wrapper.add(
    new TextRenderable(renderer, {
      content,
      ...(fg ? { fg } : {}),
      width: "100%",
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
  fg?: string;
};

export type StreamingMessage = {
  set: (content: string, fg?: string) => void;
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
    paddingLeft: 2,
    paddingRight: 1,
  });
  const text = new TextRenderable(renderer, {
    content: initialContent,
    fg,
    width: "100%",
    flexShrink: 0,
    wrapMode: "word",
  });
  wrapper.add(text);
  session.add(wrapper);
  renderer.requestRender();
  return {
    set: (content: string, fg = WHITE) => {
      text.fg = fg;
      text.content = content;
      renderer.requestRender();
    },
  };
};

type UserMessageArgs = {
  session: ScrollBoxRenderable;
  renderer: CliRenderer;
  content: string;
  fg?: string;
};

export const addUserMessageToSession = ({
  session,
  renderer,
  content,
  fg = WHITE,
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
      width: "100%",
      flexShrink: 0,
      wrapMode: "word",
    }),
  );
  wrapper.add(body);
  session.add(wrapper);
  renderer.requestRender();
};
