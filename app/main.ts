import { startTui } from "./tui/app";
import type { ResponseMessages } from "./types";

export const sessionMessages: ResponseMessages = [];

startTui().catch((error) => {
  console.error(error);
  process.exit(1);
});
