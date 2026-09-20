import type { ChatCompletionTool } from "openai/resources";

export const readFileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Read",
    description:
      "Read and return the contents of a file. Prefer this over Bash cat/head/tail. Always Read a file before editing it so old_string matches verbatim.",
    parameters: {
      type: "object",
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path to the file to read. Prefer absolute paths; relative paths resolve from the working directory.",
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
    description:
      "Create a new file or overwrite an existing file with full content. Use only for new files or complete rewrites; prefer Edit for targeted changes to existing files.",
    parameters: {
      type: "object",
      required: ["file_path", "content"],
      properties: {
        file_path: {
          type: "string",
          description: "Absolute path of the file to write to",
        },
        content: {
          type: "string",
          description: "The complete content to write to the file",
        },
      },
    },
  },
};

export const EditFileTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Edit",
    description:
      "Apply precise edits to existing files. old_string must match the file content exactly, including whitespace. Read the target region first. Fails if old_string is missing or occurs multiple times (use replace_all=true only when intended).",
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

export const GlobTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "Glob",
    description:
      "Fast file pattern matching. Prefer this over Bash ls/find for locating files by name. Searches from cwd unless path is given; skips node_modules/.git unless the pattern explicitly targets them.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "The glob pattern to match files against",
        },
        path: {
          type: "string",
          description:
            "The directory to search in. If not specified, the current working directory will be used.",
        },
      },
      required: ["pattern"],
      additionalProperties: false,
    },
  },
};
