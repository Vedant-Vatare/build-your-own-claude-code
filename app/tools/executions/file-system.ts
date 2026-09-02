import { readFile, writeFile } from "node:fs/promises";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources";
import type {
  EditFileToolArgs,
  ReadToolArgs,
  ToolCallResult,
  WriteFileToolArgs,
} from "../../types";

export const executeReadFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { file_path } = JSON.parse(toolCall.function.arguments) as ReadToolArgs;

  if (!file_path) {
    console.error("file path cannot be undefined");

    return { role: "tool", tool_call_id: toolCall.id, content: "file path cannot be undefined" };
  }

  const data = await readFile(file_path, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: data };
};

export const executeWriteFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { file_path, content } = JSON.parse(toolCall.function.arguments) as WriteFileToolArgs;

  if (!file_path || !content) {
    console.error("file path or content cannot be undefined");
    return {
      role: "tool",
      tool_call_id: toolCall.id,
      content: "file path or content cannot be undefined",
    };
  }

  await writeFile(file_path, content, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: content };
};

export const executeEditFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { changes: edits } = JSON.parse(toolCall.function.arguments) as EditFileToolArgs;

  const editResult = [];
  for (const edit of edits) {
    const result = await editFile(
      edit.file_path,
      edit.old_string,
      edit.new_string,
      edit.replace_all,
    );
    editResult.push(result);
  }
  return { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(editResult) };
};

async function editFile(
  filePath: string,
  oldString: string,
  newString: string,
  replaceAll = false,
) {
  const content = await readFile(filePath, "utf8");

  if (oldString === "") {
    throw new Error("old_string cannot be empty");
  }

  const first = content.indexOf(oldString);

  if (first === -1) {
    throw new Error("old_string not found");
  }

  if (replaceAll) {
    const updated = content.replaceAll(oldString, newString);

    await writeFile(filePath, updated, "utf8");

    return {
      replacements: content.split(oldString).length - 1,
    };
  }

  const second = content.indexOf(oldString, first + oldString.length);

  if (second !== -1) {
    throw new Error("old_string occurs multiple times; use replace_all=true");
  }

  const updated = content.slice(0, first) + newString + content.slice(first + oldString.length);

  await writeFile(filePath, updated, "utf8");

  return {
    replacements: 1,
  };
}
