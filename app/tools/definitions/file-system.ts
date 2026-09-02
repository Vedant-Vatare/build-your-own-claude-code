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

export const EditFileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Edit",
    description: "Apply one or more context-checked edits to files.",
    parameters: {
      type: "object",
      properties: {
        changes: {
          type: "array",
          description: "The file changes to apply",
          items: {
            type: "object",
            properties: {
              file_path: {
                type: "string",
                description: "Path to the file.",
              },
              old_string: {
                type: "string",
                description: "Exact content need to be replaced",
              },
              new_string: {
                type: "string",
                description: "new content to be replaced with",
              },
              replace_all: {
                type: "boolean",
                description: "whether to replace all the matching content or not",
              },
            },
            required: ["file_path", "old_string", "new_string"],
          },
        },
      },
      required: ["changes"],
    },
  },
};
