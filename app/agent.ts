import OpenAI from "openai";
import type { ChatCompletionMessageToolCall } from "openai/resources";
import { sessionMessages } from "./main";
import { chatCompletionTools } from "./tools/definitions";
import { executeToolCall } from "./tools/executions";

export const agent = async (
  prompt: string,
  onToken?: (delta: string, fullContent: string) => void,
) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.MODEL;
  const baseURL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

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

  sessionMessages.push({ role: "user", content: prompt });

  while (true) {
    const stream = await client.chat.completions.create({
      model: model,
      messages: sessionMessages,
      tools: chatCompletionTools,
      stream: true,
    });

    let content = "";
    const toolSlots: { id: string; name: string; args: string }[] = [];
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) {
        continue;
      }
      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }
      const delta = choice.delta;
      if (delta?.content) {
        content += delta.content;
        onToken?.(delta.content, content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          let slot = toolSlots[tc.index];
          if (!slot) {
            slot = { id: "", name: "", args: "" };
            toolSlots[tc.index] = slot;
          }
          if (tc.id) {
            slot.id = tc.id;
          }
          if (tc.function?.name) {
            slot.name += tc.function.name;
          }
          if (tc.function?.arguments) {
            slot.args += tc.function.arguments;
          }
        }
      }
    }

    const toolCalls: ChatCompletionMessageToolCall[] = toolSlots
      .filter((slot) => slot.id || slot.name)
      .map((slot) => ({
        id: slot.id,
        type: "function" as const,
        function: { name: slot.name, arguments: slot.args },
      }));

    sessionMessages.push({
      role: "assistant",
      content: content || null,
      ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
    });

    if (toolCalls.length === 0) {
      return content;
    }

    const toolCallResults = await Promise.allSettled(
      toolCalls.map((toolcall: ChatCompletionMessageToolCall) => executeToolCall(toolcall)),
    );

    toolCallResults.forEach(
      (
        toolCallResult: PromiseSettledResult<{
          role: "tool";
          tool_call_id: string;
          content: string;
        }>,
        index: number,
      ) => {
        if (toolCallResult.status === "fulfilled") {
          sessionMessages.push(toolCallResult.value);
        } else {
          const errorMessage =
            toolCallResult.reason instanceof Error
              ? `${toolCallResult.reason.name}: ${toolCallResult.reason.message}`
              : "Error executing tool";
          sessionMessages.push({
            role: "tool",
            tool_call_id: toolCalls[index].id,
            content: errorMessage,
          });
        }
      },
    );

    if (finishReason === "stop") {
      return content;
    }
  }
};
