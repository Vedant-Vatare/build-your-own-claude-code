import type { ChatCompletionMessageToolCall } from "openai/resources";
import { debug } from "../../debug";
import type { ApprovalDecision, ApprovalRequest, ToolCallResult } from "../../types";
import { checkPermission } from "../permissionRules";
import { loadUserRules, saveAlwaysAllow } from "../permissionStore";
import { executeBashTool } from "./command-line";
import {
  executeEditFileTool,
  executeGlobTool,
  executeReadFileTool,
  executeWriteFileTool,
} from "./file-system";

export type PermissionGate = {
  scopeDir: string;
  requestApproval: (req: ApprovalRequest) => Promise<ApprovalDecision>;
  onAskStarted?: (id: string) => void;
  onAskResolved?: (id: string, decision: ApprovalDecision) => void;
};

type LooseArgs = {
  command?: unknown;
  file_path?: unknown;
  pattern?: unknown;
  changes?: unknown;
};

const matchTextsFor = (toolName: string, argsJson: string): string[] => {
  try {
    const args = JSON.parse(argsJson) as LooseArgs;
    switch (toolName) {
      case "bash":
        return typeof args.command === "string" ? [args.command] : [];
      case "read":
      case "write":
        return typeof args.file_path === "string" ? [args.file_path] : [];
      case "glob":
        return typeof args.pattern === "string" ? [args.pattern] : [];
      case "edit": {
        if (!Array.isArray(args.changes)) return [];
        const paths = args.changes
          .map((change) => (change as { file_path?: unknown }).file_path)
          .filter((path): path is string => typeof path === "string");
        return paths;
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
};

const denials = new WeakSet<object>();

export const isDenialResult = (result: ToolCallResult): boolean => denials.has(result);

const denial = (toolCall: ChatCompletionMessageToolCall, content: string): ToolCallResult => {
  const result: ToolCallResult = {
    role: "tool",
    tool_call_id: toolCall.id,
    content,
  };
  denials.add(result);
  return result;
};

export const executeToolCall = async (
  toolCall: ChatCompletionMessageToolCall,
  gate?: PermissionGate,
): Promise<ToolCallResult> => {
  if (toolCall.type !== "function") {
    throw new Error("not a valid tool call");
  }

  const toolName = toolCall.function.name.toLowerCase();
  debug({ toolName, args: toolCall.function.arguments });

  if (gate) {
    const texts = matchTextsFor(toolName, toolCall.function.arguments);
    if (texts.length > 0) {
      const permission = checkPermission(toolName, texts, loadUserRules(toolName, gate.scopeDir));
      if (permission.action === "deny") {
        const where = permission.source === "user" ? "your permissions" : "the built-in policy";
        return denial(
          toolCall,
          `Denied by ${where} (matched "${permission.pattern ?? ""}"). Do not retry this exact call; propose a safer alternative instead.`,
        );
      }
      if (permission.action === "ask") {
        gate.onAskStarted?.(toolCall.id);
        const decision = await gate.requestApproval({
          tool: toolName,
          matchText: texts.join(", "),
          ...(permission.pattern ? { pattern: permission.pattern } : {}),
        });
        gate.onAskResolved?.(toolCall.id, decision);
        if (decision === "deny") {
          return denial(
            toolCall,
            "Denied by user. Do not retry this exact call; propose an alternative or ask how to proceed.",
          );
        }
        if (decision === "always") {
          for (const text of texts) saveAlwaysAllow(toolName, gate.scopeDir, text);
        }
      }
    }
  }

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
