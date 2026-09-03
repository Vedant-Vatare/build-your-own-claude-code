import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { agent } from "../agent";

export const getUserPrompt = async () => {
  const rl = readline.createInterface({ input, output });

  while (true) {
    let prompt: string;
    try {
      prompt = await rl.question("> ");
    } catch {
      break;
    }
    try {
      await agent(prompt);
    } catch (error) {
      console.error(error);
    }
  }
  rl.close();
};
