import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

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
  period: "week" | "month" | "all"
): Promise<string> {
  const fn = httpsCallable<
    { memories: Memory[]; period: string },
    { text: string }
  >(functions, "generateRecap");

  const result = await fn({ memories, period });
  return result.data.text;
}

export async function chatWithMemories(
  memories: Memory[],
  messages: ChatMessage[]
): Promise<string> {
  const fn = httpsCallable<
    { memories: Memory[]; messages: ChatMessage[] },
    { text: string }
  >(functions, "chatWithMemories");

  const result = await fn({ memories, messages });
  return result.data.text;
}
