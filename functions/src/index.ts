import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

const anthropicApiKey = defineSecret("ANTHROPIC_API_KEY");

interface Memory {
  text: string;
  mood: string | null;
  date: string;
}

interface RecapRequest {
  memories: Memory[];
  period: "week" | "month";
}

interface ChatRequest {
  memories: Memory[];
  messages: { role: "user" | "assistant"; content: string }[];
}

export const generateRecap = onCall(
  { secrets: [anthropicApiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { memories, period } = request.data as RecapRequest;

    if (!memories || memories.length === 0) {
      throw new HttpsError("invalid-argument", "No memories provided.");
    }

    const memoriesText = memories
      .map((m) => `[${m.date}]${m.mood ? ` ${m.mood}` : ""} ${m.text}`)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey.value(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `You are a thoughtful personal journal assistant. Below are someone's daily memories from the past ${period}. Write a warm, reflective summary that:

1. Identifies themes and patterns
2. Notes emotional trends (based on moods and language)
3. Highlights standout moments
4. Ends with a gentle, encouraging reflection

Keep it concise (150-250 words). Use a warm, personal tone — like a good friend reflecting back what they noticed.

Memories:
${memoriesText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpsError("internal", `Claude API error: ${error}`);
    }

    const data = await response.json();
    return { text: data.content[0].text };
  }
);

export const chatWithMemories = onCall(
  { secrets: [anthropicApiKey], invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { memories, messages } = request.data as ChatRequest;

    if (!memories || memories.length === 0) {
      throw new HttpsError("invalid-argument", "No memories provided.");
    }

    const memoriesText = memories
      .map((m) => `[${m.date}]${m.mood ? ` ${m.mood}` : ""} ${m.text}`)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicApiKey.value(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: `You are a thoughtful personal memory assistant. The user has recorded the following daily memories. Answer their questions about their memories, help them find patterns, recall specific moments, or reflect on their experiences. Be warm, concise, and insightful.

Memories:
${memoriesText}`,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new HttpsError("internal", `Claude API error: ${error}`);
    }

    const data = await response.json();
    return { text: data.content[0].text };
  }
);
