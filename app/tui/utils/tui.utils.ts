import type { CliRenderer } from "@opentui/core";

let shuttingDown = false;
export const shutdown = (renderer: CliRenderer) => {
  if (shuttingDown) return;
  shuttingDown = true;
  renderer.destroy();
};
