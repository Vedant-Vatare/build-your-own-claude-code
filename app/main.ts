import { readFile } from "node:fs/promises";

import OpenAI from "openai";
import type { ReadToolArgs, ResponseMessages, ToolCallResult } from "./types";
import type { ChatCompletionMessageToolCall } from "openai/resources";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
  const messages: ResponseMessages = [{ role: "user", content: prompt }];
  let steps = 0;
  while (steps <= 10) {
    const response = await client.chat.completions.create({
      model: "anthropic/claude-haiku-4.5",
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "Read",
            description: "Read and return the contents of a file",
            parameters: {
              type: "object",
              properties: {
                file_path: {
                  type: "string",
                  description: "The path to the file to read",
                },
              },
              required: ["file_path"],
            },
          },
        },
      ],
    });

    messages.push({
      role: "assistant",
      content: response.choices[0].message.content,
      tool_calls: response.choices[0].message.tool_calls,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
      break;
    }
    const toolCalls = response.choices[0].message.tool_calls || [];

    for (const toolCall of toolCalls) {
      const toolCallResult = await executeTool(toolCall);
      if (toolCallResult) {
        messages.push(toolCallResult);
      }
    }

    if (response.choices[0].finish_reason === "stop") {
      console.log(messages[messages.length - 1].content);
      break;
    }
    steps++;
  }
}

const executeTool = async (
  toolCall: ChatCompletionMessageToolCall,
): Promise<ToolCallResult | undefined> => {
  if (
    toolCall.type === "function" &&
    toolCall.function.name.toLowerCase() === "read"
  ) {
    const { file_path } = JSON.parse(
      toolCall.function.arguments,
    ) as ReadToolArgs;

    const data = await readFile(file_path, "utf-8");
    return { role: "tool", tool_call_id: toolCall.id, content: data };
  }
  return undefined;
};

main();
