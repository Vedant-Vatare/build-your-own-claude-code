import type { ChatCompletionMessageToolCall } from "openai/resources";
import type { ReadToolArgs } from "../../types";
import { readFile } from "node:fs/promises";

export const executeReadFileTool = async (
  toolCall: ChatCompletionMessageToolCall,
) => {
  if (
    toolCall.type === "function" &&
    toolCall.function.name.toLowerCase() === "read"
  ) {
    const { file_path } = JSON.parse(
      toolCall.function.arguments,
    ) as ReadToolArgs;

    const data = await readFile(file_path, "utf-8");
    return { role: "tool", tool_call_id: toolCall.id, content: data };
  }
  return undefined;
};
