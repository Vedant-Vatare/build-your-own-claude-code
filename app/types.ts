import type { ChatCompletionMessageToolCall } from "openai/resources";

export type ReadToolArgs = {
  file_path: string;
};

export type WriteFileToolArgs = {
  file_path: string;
  content: string;
};

export type ToolCallResult = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

export type UserMessage = { role: "user"; content: string };
export type AssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: ChatCompletionMessageToolCall[];
};

export type ResponseMessage = UserMessage | AssistantMessage;

export type ResponseMessages = (ResponseMessage | ToolCallResult)[];