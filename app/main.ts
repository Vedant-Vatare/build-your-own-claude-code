import { debug } from "./debug";
import { startTui } from "./tui/app";
import type { ResponseMessages } from "./types";

export const sessionMessages: ResponseMessages = [];

startTui().catch((error) => {
  debug(error);
  console.error(error);
  process.exit(1);
});
