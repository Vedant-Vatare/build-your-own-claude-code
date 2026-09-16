import {
  BoxRenderable,
  type CliRenderer,
  InputRenderable,
  type ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../../agent";
import { BASE_TEXT, DIM, ERROR } from "../constants";
import { shutdown } from "../utils/tui.utils";
import { addMessageToSession, addUserMessageToSession, createStreamingMessage } from "./session";

export const createUserInput = (session: ScrollBoxRenderable, renderer: CliRenderer) => {
  const inputBox = new BoxRenderable(renderer, {
    height: 3,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    border: ["top", "bottom"],
    borderStyle: "single",
    borderColor: DIM,
    marginLeft: 1,
    marginRight: 1,
    paddingLeft: 1,
    paddingRight: 1,
  });
  inputBox.add(new TextRenderable(renderer, { content: "❯ ", fg: BASE_TEXT }));
  const input = new InputRenderable(renderer, {
    flexGrow: 1,
    textColor: BASE_TEXT,
    cursorStyle: { style: "default" },
  });
  inputBox.add(input);
  let busy = false;

  const handleUserInputSubmit = async (value: string) => {
    const text = value.trim();
    input.value = "";
    renderer.requestRender();
    if (!text) {
      input.focus();
      return;
    }
    if (text === "/exit" || text === "/quit") {
      shutdown(renderer);
      return;
    }
    if (busy) {
      addMessageToSession({
        session,
        renderer,
        content: "Still working, wait for the current response.",
      });
      input.focus();
      return;
    }

    busy = true;

    addUserMessageToSession({
      session,
      renderer,
      content: `${text}`,
    });

    const live = createStreamingMessage({
      session,
      renderer,
      initialContent: "Thinking",
      fg: DIM,
    });

    let streamed = "";

    const appendStreamedDelta = (delta: string) => {
      streamed += delta;
      live.set(streamed);
    };

    try {
      const agentResponse = await agent(text, appendStreamedDelta);
      live.set(agentResponse || streamed || "(no response)", BASE_TEXT);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      live.set(errorMessage, ERROR);
    } finally {
      busy = false;
      input.focus();
    }
  };
  input.on("enter", handleUserInputSubmit);

  return { inputBox, input };
};
