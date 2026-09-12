import {
  BoxRenderable,
  type CliRenderer,
  InputRenderable,
  RGBA,
  type ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../../agent";
import { DIM, ERROR, WHITE } from "../constants";
import { shutdown } from "../utils/tui.utils";
import { addMessageToSession, addUserMessageToSession } from "./session";

export const createUserInput = (session: ScrollBoxRenderable, renderer: CliRenderer) => {
  const inputBox = new BoxRenderable(renderer, {
    height: 3,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    border: ["top", "bottom"],
    borderStyle: "single",
    borderColor: DIM,
    marginLeft: 2,
    marginRight: 2,
    paddingLeft: 1,
    paddingRight: 1,
  });
  inputBox.add(new TextRenderable(renderer, { content: "❯ ", fg: WHITE }));
  const input = new InputRenderable(renderer, {
    flexGrow: 1,
    textColor: RGBA.defaultForeground(),
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
    try {
      const agentResponse = await agent(text);
      if (agentResponse) {
        addMessageToSession({
          session,
          renderer,
          content: agentResponse,
          fg: WHITE,
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      addMessageToSession({
        session,
        renderer,
        content: errorMessage,
        fg: ERROR,
      });
    } finally {
      busy = false;
      input.focus();
    }
  };
  input.on("enter", handleUserInputSubmit);

  return { inputBox, input };
};
