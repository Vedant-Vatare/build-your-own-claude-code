import type { ChatCompletionMessageFunctionToolCall } from "openai/resources";
import type { BashToolArgs, ToolCallResult } from "../../types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
export const executeBashTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult | undefined> => {
  const { command } = JSON.parse(toolCall.function.arguments) as BashToolArgs;
  if (!command) {
    console.error("command cannot be undefined");
    return undefined;
  }
  try {
    const {stdout, stderr} = await execAsync(command, {
      timeout: 120_000,
       maxBuffer: 1024 * 1024 * 100,
    })
    return {
      role: "tool",
      tool_call_id: toolCall.id,
      content: stdout || stderr || "(no output)",
    };
  } catch(e) {
      const error = e as { message: string; stdout?: string; stderr?: string };
    return {
      role: "tool",
      tool_call_id: toolCall.id,
      content: `Error: ${error.message}\n${error.stderr ?? ""}`,
    };
  }

  
};
