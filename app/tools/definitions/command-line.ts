import type { ChatCompletionTool } from "openai/resources";

export const BashTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Bash",
    description:
      "Execute a shell command with a 120s timeout. Use only when no dedicated tool fits (no Bash cat/sed/ls) and avoid cd command. Returns stdout, stderr, or the error with exit context on failure.",
    parameters: {
      type: "object",
      required: ["command"],
      properties: {
        command: {
          type: "string",
          description: "The command to execute",
        },
      },
    },
  },
};
