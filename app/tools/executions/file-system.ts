import type { ChatCompletionMessageFunctionToolCall } from "openai/resources";
import type {
  ReadToolArgs,
  ToolCallResult,
  WriteFileToolArgs,
} from "../../types";
import { readFile, writeFile } from "node:fs/promises";

export const executeReadFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult | undefined> => {
  const { file_path } = JSON.parse(toolCall.function.arguments) as ReadToolArgs;

  if (!file_path) {
    console.error("file path cannot be undefined");
    return undefined;
  }

  const data = await readFile(file_path, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: data };
};

export const executeWriteFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult | undefined> => {
  const { file_path, content } = JSON.parse(
    toolCall.function.arguments,
  ) as WriteFileToolArgs;

  if (!file_path || !content) {
    console.error("file path or content cannot be undefined");
    return undefined;
  }

  await writeFile(file_path, content, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: content };
};
