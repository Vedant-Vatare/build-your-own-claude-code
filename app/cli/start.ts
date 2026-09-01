import * as readline from "node:readline/promises";

import { stdin as input, stdout as output } from "node:process";
import { agent } from "../agent";

export const getUserPrompt = async () => {
  const rl = readline.createInterface({ input, output });

  try {
    const prompt = await rl.question("> ");
    await agent(prompt)
    
  } catch (error) {
    console.error(error);
  } finally {
    rl.close();
  }
  
  getUserPrompt()
};
