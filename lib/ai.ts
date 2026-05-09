const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "";

export type Memory = {
  text: string;
  mood: string | null;
  date: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function generateRecapSummary(
  memories: Memory[],
  period: "week" | "month"
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_ANTHROPIC_API_KEY in environment. Add it to your .env file."
    );
  }

  const memoriesText = memories
    .map((m) => `[${m.date}]${m.mood ? ` ${m.mood}` : ""} ${m.text}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
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
    throw new Error(`API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

export async function chatWithMemories(
  memories: Memory[],
  messages: ChatMessage[]
): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "Missing EXPO_PUBLIC_ANTHROPIC_API_KEY in environment. Add it to your .env file."
    );
  }

  const memoriesText = memories
    .map((m) => `[${m.date}]${m.mood ? ` ${m.mood}` : ""} ${m.text}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
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
    throw new Error(`API error: ${response.status} — ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}
