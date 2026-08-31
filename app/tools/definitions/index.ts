import type { ChatCompletionTool } from "openai/resources";
import { readFileTool, WriteFileTool } from "./file-system";

export const chatCompletionTools: ChatCompletionTool[] = [readFileTool, WriteFileTool];
