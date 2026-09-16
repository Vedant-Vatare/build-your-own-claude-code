import {
  BoxRenderable,
  type CliRenderer,
  type RGBA,
  ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { ACCENT, BASE_TEXT, DIM } from "../constants";

export const createSession = (renderer: CliRenderer) => {
  return new ScrollBoxRenderable(renderer, {
    flexGrow: 1,
    width: "100%",
    stickyScroll: true,
    stickyStart: "bottom",
    contentOptions: { justifyContent: "flex-end", gap: 2 },
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
  fg?: string | RGBA;
};

export type StreamingMessage = {
  set: (content: string, fg?: string | RGBA) => void;
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
    paddingLeft: 1,
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
    set: (content: string, fg = BASE_TEXT) => {
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
      width: "100%",
      flexShrink: 0,
      wrapMode: "word",
    }),
  );
  wrapper.add(body);
  session.add(wrapper);
  renderer.requestRender();
};
