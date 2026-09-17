import {
  BoxRenderable,
  type CliRenderer,
  InputRenderable,
  type ScrollBoxRenderable,
  TextRenderable,
} from "@opentui/core";
import { agent } from "../../agent";
import type { ToolActivityEvent } from "../../types";
import { ACCENT, BASE_TEXT, DIM, ERROR } from "../constants";
import { shutdown } from "../utils/tui.utils";
import {
  addMessageToSession,
  addUserMessageToSession,
  createStreamingMessage,
  type ToolRow,
} from "./session";

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
  inputBox.add(new TextRenderable(renderer, { content: "❯ ", fg: ACCENT }));
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

    let producedOutput = false;
    const toolRows = new Map<string, ToolRow>();

    const failInflightTools = (): void => {
      for (const row of toolRows.values()) {
        row.setToolState("failed");
      }
      toolRows.clear();
    };

    try {
      const onTextStream = (delta: string) => {
        producedOutput = true;
        live.appendText(delta);
      };

      const onToolUse = (event: ToolActivityEvent) => {
        producedOutput = true;
        let toolRow = toolRows.get(event.id);
        if (!toolRow) {
          toolRow = live.addToolRow(event.name, event.args);
          toolRows.set(event.id, toolRow);
        }
        if (event.state === "succeeded" || event.state === "failed") {
          toolRows.delete(event.id);
        }
        toolRow.setToolState(event.state, event.error);
      };

      const agentResponse = await agent({ prompt: text, onTextStream, onToolUse });

      toolRows.clear();
      if (!agentResponse && !producedOutput) {
        live.appendText("(no response)");
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      failInflightTools();
      live.appendText(errorMessage, ERROR);
    } finally {
      busy = false;
      input.focus();
    }
  };
  input.on("enter", handleUserInputSubmit);

  return { inputBox, input };
};
