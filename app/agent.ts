import OpenAI from "openai";
import type { ResponseMessages } from "./types";
import { chatCompletionTools } from "./tools/definitions";
import { executeToolCall } from "./tools/executions";
import { sessionMessages } from "./main";

export const agent = async (prompt: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.MODEL;
  const baseURL =
    process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

  if (!apiKey || !model) {
    throw new Error("OPENROUTER_API_KEY or LLM model is not set");
  }
  if (!prompt) {
    throw new Error("error: prompt is required");
  }

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });

  sessionMessages.push({role: "user", content: prompt})
  
  while (true) {
    const response = await client.chat.completions.create({
      model: model,
      messages: sessionMessages,
      tools: chatCompletionTools,
    });

    sessionMessages.push({
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
        sessionMessages.push(toolCallResult);
      }
    }

    if (response.choices[0].finish_reason === "stop") {
      console.log(sessionMessages[sessionMessages.length - 1].content);
      break;
    }
  }
};
