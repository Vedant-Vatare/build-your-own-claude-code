import type { ChatCompletionMessageToolCall } from "openai/resources";
import { debug } from "../../debug";
import type { ToolCallResult } from "../../types";
import { executeBashTool } from "./command-line";
import {
  executeEditFileTool,
  executeGlobTool,
  executeReadFileTool,
  executeWriteFileTool,
} from "./file-system";

export const executeToolCall = async (
  toolCall: ChatCompletionMessageToolCall,
): Promise<ToolCallResult> => {
  if (toolCall.type !== "function") {
    throw new Error("not a valid tool call");
  }

  const toolName = toolCall.function.name.toLowerCase();
  debug({ toolName, args: toolCall.function.arguments });

  switch (toolName) {
    case "read":
      return executeReadFileTool(toolCall);
    case "write":
      return executeWriteFileTool(toolCall);
    case "edit":
      return executeEditFileTool(toolCall);
    case "bash":
      return executeBashTool(toolCall);
    case "glob":
      return executeGlobTool(toolCall);
    default:
  }
  return {
    role: "tool",
    tool_call_id: toolCall.id,
    content: `invalid tool call name ${toolName}`,
  };
};
