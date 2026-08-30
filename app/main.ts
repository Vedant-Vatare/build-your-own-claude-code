import { readFile } from "node:fs/promises";

import OpenAI from "openai";
import type { ReadToolArgs } from "./types";

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

	const response = await client.chat.completions.create({
		model: "anthropic/claude-haiku-4.5",
		messages: [{ role: "user", content: prompt }],
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

	if (!response.choices || response.choices.length === 0) {
		throw new Error("no choices in response");
	}

	const toolCalls = response.choices[0].message.tool_calls;

	if (!toolCalls) {
		console.log(response.choices[0].message.content);
		return;
	}

	const firstToolCall = toolCalls[0];

	if (
		firstToolCall.type === "function" &&
		firstToolCall.function.name.toLowerCase() === "read"
	) {
		const { file_path } = JSON.parse(
			firstToolCall.function.arguments,
		) as ReadToolArgs;

		const data = await readFile(file_path, "utf-8");
		console.log(data);
	}
}

main();
