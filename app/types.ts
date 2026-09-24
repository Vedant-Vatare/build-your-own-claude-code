import type { ChatCompletionMessageToolCall } from "openai/resources";

export type ApprovalRequest = {
  tool: string;
  matchText: string;
  pattern?: string;
};

export type ApprovalDecision = "once" | "always" | "deny";

export type AgentParams = {
  prompt: string;
  onTextStream?: (delta: string, fullContent: string) => void;
  onToolUse?: (event: ToolActivityEvent) => void;
  onPermissionRequest?: (req: ApprovalRequest) => Promise<ApprovalDecision>;
};

export type ReadToolArgs = {
  file_path: string;
};

export type WriteFileToolArgs = {
  file_path: string;
  content: string;
};

export type BashToolArgs = {
  command: string;
};

export type GlobToolArgs = {
  pattern: string;
  path?: string;
};

export type EditFileToolArgs = {
  changes: {
    file_path: string;
    old_string: string;
    new_string: string;
    replace_all?: boolean;
  }[];
};

export type ToolCallResult = {
  role: "tool";
  tool_call_id: string;
  content: string;
};

export type ToolActivityState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "awaiting-approval"
  | "denied";

export type ToolActivityEvent = {
  id: string;
  name: string;
  args: string;
  state: ToolActivityState;
  error?: string;
};

export type SystemMessage = { role: "system"; content: string };
export type UserMessage = { role: "user"; content: string };
export type AssistantMessage = {
  role: "assistant";
  content: string | null;
  tool_calls?: ChatCompletionMessageToolCall[];
};

export type ResponseMessage = SystemMessage | UserMessage | AssistantMessage;

export type ResponseMessages = (ResponseMessage | ToolCallResult)[];
