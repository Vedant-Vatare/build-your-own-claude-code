import type { ChatCompletionTool } from "openai/resources";
import { BashTool } from "./command-line";
import { EditFileTool, readFileTool, WriteFileTool } from "./file-system";

export const chatCompletionTools: ChatCompletionTool[] = [
  readFileTool,
  WriteFileTool,
  BashTool,
  EditFileTool,
];
