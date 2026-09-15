import { readFile, stat, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources";
import { debug } from "../../debug";
import type {
  EditFileToolArgs,
  GlobToolArgs,
  ReadToolArgs,
  ToolCallResult,
  WriteFileToolArgs,
} from "../../types";

const GLOB_LIMIT = 100;
const GLOB_SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".next", "coverage"]);

export const executeReadFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { file_path } = JSON.parse(toolCall.function.arguments) as ReadToolArgs;

  if (!file_path) {
    debug("file path cannot be undefined");

    return { role: "tool", tool_call_id: toolCall.id, content: "file path cannot be undefined" };
  }

  const data = await readFile(file_path, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: data };
};

export const executeWriteFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { file_path, content } = JSON.parse(toolCall.function.arguments) as WriteFileToolArgs;

  if (!file_path || !content) {
    debug("file path or content cannot be undefined");
    return {
      role: "tool",
      tool_call_id: toolCall.id,
      content: "file path or content cannot be undefined",
    };
  }

  await writeFile(file_path, content, "utf-8");
  return { role: "tool", tool_call_id: toolCall.id, content: content };
};

export const executeGlobTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const failedToolCall = (content: string): ToolCallResult => ({
    role: "tool",
    tool_call_id: toolCall.id,
    content,
  });

  let args: GlobToolArgs;
  try {
    args = JSON.parse(toolCall.function.arguments) as GlobToolArgs;
  } catch {
    return failedToolCall("Invalid Glob arguments: must be JSON with a pattern field");
  }
  const { pattern, path } = args;

  if (!pattern) {
    return failedToolCall("Glob pattern cannot be undefined.");
  }
  if (pattern.includes("\0") || path?.includes("\0")) {
    return failedToolCall("Glob pattern/path contains a null byte, remove it and retry");
  }
  if (path === "undefined" || path === "null") {
    return failedToolCall("Glob path must be omitted for cwd");
  }

  const cwd = process.cwd();
  const searchDir = path ? (isAbsolute(path) ? path : resolve(cwd, path)) : cwd;

  try {
    const info = await stat(searchDir);
    if (!info.isDirectory()) return failedToolCall(`Path is not a directory: ${path}`);
  } catch {
    return failedToolCall(
      `Directory does not exist: ${path ?? "."}. Current working directory is ${cwd}.`,
    );
  }

  const relSearch = relative(cwd, searchDir).replace(/\\/g, "/");
  const explicitDirs = new Set(
    [...GLOB_SKIP_DIRS].filter(
      (d) =>
        pattern.includes(`${d}/`) ||
        pattern.includes(`${d}\\`) ||
        relSearch === d ||
        relSearch.startsWith(`${d}/`),
    ),
  );

  try {
    const glob = new Bun.Glob(pattern);
    const matches: { file: string; mtime: number }[] = [];

    for await (const match of glob.scan({ cwd: searchDir, onlyFiles: true })) {
      const normalized = match.replace(/\\/g, "/");
      if (
        normalized
          .split("/")
          .some((seg: string) => GLOB_SKIP_DIRS.has(seg) && !explicitDirs.has(seg))
      )
        continue;
      matches.push({ file: normalized, mtime: 0 });
      if (matches.length > GLOB_LIMIT) break;
    }

    const truncated = matches.length > GLOB_LIMIT;
    const kept = truncated ? matches.slice(0, GLOB_LIMIT) : matches;

    await Promise.all(
      kept.map(async (m) => {
        try {
          const info = await stat(resolve(searchDir, m.file));
          m.mtime = info.mtimeMs;
        } catch {
          m.mtime = 0;
        }
      }),
    );
    kept.sort((a, b) => b.mtime - a.mtime);

    if (kept.length === 0) return failedToolCall("No files found");

    const display = kept.map((m) => {
      const abs = resolve(searchDir, m.file);
      const rel = relative(cwd, abs).replace(/\\/g, "/");
      return rel && !rel.startsWith("..") ? rel : abs.replace(/\\/g, "/");
    });

    const content = truncated
      ? `${display.join("\n")}\n(Results are truncated: showing first ${GLOB_LIMIT} results. Consider using a more specific path or pattern.)`
      : display.join("\n");

    return { role: "tool", tool_call_id: toolCall.id, content };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    debug(`glob failed: ${msg}`);
    return failedToolCall(`Glob failed: ${msg}`);
  }
};

export const executeEditFileTool = async (
  toolCall: ChatCompletionMessageFunctionToolCall,
): Promise<ToolCallResult> => {
  const { changes: edits } = JSON.parse(toolCall.function.arguments) as EditFileToolArgs;

  const editResult = [];
  for (const edit of edits) {
    const result = await editFile(
      edit.file_path,
      edit.old_string,
      edit.new_string,
      edit.replace_all,
    );
    editResult.push(result);
  }
  return { role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(editResult) };
};

async function editFile(
  filePath: string,
  oldString: string,
  newString: string,
  replaceAll = false,
) {
  const content = await readFile(filePath, "utf8");

  if (oldString === "") {
    throw new Error("old_string cannot be empty");
  }

  const first = content.indexOf(oldString);

  if (first === -1) {
    throw new Error("old_string not found");
  }

  if (replaceAll) {
    const updated = content.replaceAll(oldString, newString);

    await writeFile(filePath, updated, "utf8");

    return {
      replacements: content.split(oldString).length - 1,
    };
  }

  const second = content.indexOf(oldString, first + oldString.length);

  if (second !== -1) {
    throw new Error("old_string occurs multiple times; use replace_all=true");
  }

  const updated = content.slice(0, first) + newString + content.slice(first + oldString.length);

  await writeFile(filePath, updated, "utf8");

  return {
    replacements: 1,
  };
}
