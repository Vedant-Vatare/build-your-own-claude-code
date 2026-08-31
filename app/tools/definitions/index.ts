import type { ChatCompletionTool } from "openai/resources";
import { readFileTool, WriteFileTool } from "./file-system";
import { BashTool } from "./command-line";

export const chatCompletionTools: ChatCompletionTool[] = [
  readFileTool,
  WriteFileTool,
  BashTool,
];
