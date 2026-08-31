import type { ChatCompletionMessageToolCall } from "openai/resources";
import type { ToolCallResult } from "../../types";
import { executeReadFileTool } from "./file-system";

export const executeToolCall = async (
  toolCall: ChatCompletionMessageToolCall,
): Promise<ToolCallResult | undefined> => {
  if (toolCall.type !== "function") {
    console.error(toolCall);
    throw new Error("not a valid tool call");
  }
  if (toolCall.function.name.toLowerCase() === "read") {
    executeReadFileTool(toolCall);
  }
  return undefined;
};
