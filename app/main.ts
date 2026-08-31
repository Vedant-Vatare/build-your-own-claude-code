import OpenAI from "openai";
import type {  ResponseMessages } from "./types";
import { chatCompletionTools } from "./tools/definitions";
import { executeToolCall } from "./tools/executions";

async function main() {
  const [, , flag, prompt] = process.argv;
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model =process.env.MODEL;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY or LLM model is not set");
  }
  if (flag !== "-p" || !prompt) {
    throw new Error("error: -p flag is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
  const messages: ResponseMessages = [{ role: "user", content: prompt }];

  while (true) {
    const response = await client.chat.completions.create({
      model: model,
      messages: messages,
      tools: chatCompletionTools,
    });

    messages.push({
      role: "assistant",
      content: response.choices[0].message.content,
      tool_calls: response.choices[0].message.tool_calls,
    });

    if (!response.choices || response.choices.length === 0) {
      throw new Error("no choices in response");
    }
    const toolCalls = response.choices[0].message.tool_calls || [];

    for (const toolCall of toolCalls) {
      const toolCallResult = await executeToolCall(toolCall);
      if (toolCallResult) {
        messages.push(toolCallResult);
      }
    }

    if (response.choices[0].finish_reason === "stop") {
      console.log(messages[messages.length - 1].content);
      break;
    }
  }
}


main();
