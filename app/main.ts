import { getUserPrompt } from "./cli/start";
import type { ResponseMessages } from "./types";

export const sessionMessages: ResponseMessages = [];

getUserPrompt();
