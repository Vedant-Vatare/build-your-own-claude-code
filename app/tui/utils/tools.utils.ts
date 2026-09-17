export type ToolDisplay = {
  label: string;
  arg: string;
};

export const TOOL_DISPLAY: Record<string, ToolDisplay> = {
  read: { label: "Read", arg: "file_path" },
  write: { label: "Write", arg: "file_path" },
  edit: { label: "Edit", arg: "changes.0.file_path" },
  bash: { label: "Run", arg: "command" },
  glob: { label: "Find", arg: "pattern" },
};

const valueAtPath = (obj: unknown, path: string): unknown => {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index)) return undefined;
      current = current[index];
    } else if (typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
};

export const describeToolCall = (
  name: string,
  argsJson: string,
): { label: string; detail: string } => {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(argsJson) as unknown;
  } catch {
    parsed = null;
  }
  const display = TOOL_DISPLAY[name.toLowerCase()];
  if (!display) {
    const label = name ? `${name.charAt(0).toUpperCase()}${name.slice(1)}` : "Tool";
    const detail = typeof argsJson === "string" ? argsJson.replace(/\s+/g, " ").trim() : "";
    return { label, detail };
  }
  const value = parsed ? valueAtPath(parsed, display.arg) : undefined;
  return { label: display.label, detail: typeof value === "string" ? value : "" };
};
