import type { ChatCompletionTool } from "openai/resources";

export const readFileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Read",
    description: "Read and return the contents of a file",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "The path to the file to read",
        },
      },
      required: ["file_path"],
    },
  },
};

export const WriteFileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Write",
    description: "Write content to a file",
    parameters: {
      type: "object",
      required: ["file_path", "content"],
      properties: {
        file_path: {
          type: "string",
          description: "The path of the file to write to",
        },
        content: {
          type: "string",
          description: "The content to write to the file",
        },
      },
    },
  },
};
