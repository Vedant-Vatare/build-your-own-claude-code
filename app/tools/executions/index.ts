import type { ChatCompletionMessageToolCall } from "openai/resources";
import type { ToolCallResult } from "../../types";
import { executeReadFileTool, executeWriteFileTool } from "./file-system";

export const executeToolCall = async (
  toolCall: ChatCompletionMessageToolCall,
): Promise<ToolCallResult | undefined> => {
  if (toolCall.type !== "function") {
    console.error(toolCall);
    throw new Error("not a valid tool call");
  }
  const toolName = toolCall.function.name.toLowerCase()
  switch (toolName) {
    case "read":
     return  executeReadFileTool(toolCall);
    case "write":
     return  executeWriteFileTool(toolCall);
    default:
      console.error("Invalid tool call name:", toolName)
  }

  return undefined;
};
