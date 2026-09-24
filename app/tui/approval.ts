import { BoxRenderable, type CliRenderer, TextAttributes, TextRenderable } from "@opentui/core";
import type { ApprovalDecision, ApprovalRequest } from "../types";
import { paragraphTextRenderer } from "./utils/tui.utils";
import { BASE_TEXT, DIM, WHITE } from "./constants";

export type ApprovalPrompt = ApprovalRequest & {
  slot: BoxRenderable;
  renderer: CliRenderer;
};

let installed = false;
let tail: Promise<void> = Promise.resolve();
let pending: {
  resolve: (decision: ApprovalDecision) => void;
  slot: BoxRenderable;
  row: BoxRenderable;
  renderer: CliRenderer;
} | null = null;

const actionLabel = (tool: string): string => {
  switch (tool.toLowerCase()) {
    case "bash":
      return "Run this shell command";
    case "read":
      return "Read this file";
    case "write":
      return "Write this file";
    case "edit":
      return "Edit these files";
    case "glob":
      return "Search for matching files";
    default:
      return `Use ${tool}`;
  }
};

const choice = (renderer: CliRenderer, key: string, label: string): BoxRenderable => {
  const item = new BoxRenderable(renderer, {
    flexDirection: "row",
    flexShrink: 0,
    gap: 1,
  });
  item.add(
    new TextRenderable(renderer, {
      content: key,
      fg: WHITE,
      attributes: TextAttributes.BOLD,
      flexShrink: 0,
    }),
  );
  item.add(new TextRenderable(renderer, { content: label, fg: DIM, flexShrink: 0 }));
  return item;
};

const decide = (decision: ApprovalDecision): void => {
  const current = pending;
  if (!current) return;
  pending = null;
  current.slot.remove(current.row);
  current.renderer.requestRender();
  current.resolve(decision);
};

export const installApprovalKeys = (renderer: CliRenderer): void => {
  if (installed) return;
  installed = true;
  renderer.keyInput.on("keypress", (key) => {
    if (!pending) return;
    if (key.name === "y" && !key.ctrl && !key.meta) {
      key.preventDefault();
      decide("once");
    } else if (key.name === "a" && !key.ctrl && !key.meta) {
      key.preventDefault();
      decide("always");
    } else if (key.name === "n" || key.name === "escape") {
      if (key.name === "n" && (key.ctrl || key.meta)) return;
      key.preventDefault();
      decide("deny");
    }
  });
};

export const requestApproval = (prompt: ApprovalPrompt): Promise<ApprovalDecision> => {
  const run: () => Promise<ApprovalDecision> = () =>
    new Promise((resolve) => {
      const { slot, renderer, tool, matchText } = prompt;
      const row = new BoxRenderable(renderer, {
        flexDirection: "column",
        width: "100%",
        flexShrink: 0,
        border: ["top", "bottom", "left", "right"],
        borderStyle: "single",
        borderColor: DIM,
        paddingLeft: 1,
        paddingRight: 1,
      });
      const heading = new TextRenderable(renderer, {
        content: "Permission required",
        fg: WHITE,
        flexShrink: 0,
      });
      const description = paragraphTextRenderer(renderer, {
        content: `${actionLabel(tool)}: ${matchText}`,
        fg: BASE_TEXT,
      });
      const choices = new BoxRenderable(renderer, {
        flexDirection: "row",
        justifyContent: "flex-end",
        flexShrink: 0,
        width: "100%",
        gap: 2,
      });
      choices.add(choice(renderer, "Y", "allow"));
      choices.add(choice(renderer, "A", "always"));
      choices.add(choice(renderer, "N", "deny"));

      row.add(heading);
      row.add(description);
      row.add(choices);
      slot.add(row);
      renderer.requestRender();
      pending = { resolve, slot, row, renderer };
    });

  const result = tail.then(run);
  tail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};
