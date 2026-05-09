import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";
import {
  generateRecapSummary,
  chatWithMemories,
  type Memory,
  type ChatMessage,
} from "../../lib/ai";

type RecapPeriod = "week" | "month";

export default function Recaps() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<RecapPeriod>("week");
  const [recap, setRecap] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const fetchMemories = async () => {
    if (!user) return [];

    const now = new Date();
    const startDate = new Date();
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const startStr = startDate.toISOString().split("T")[0];

    const q = query(
      collection(db, "users", user.uid, "memories"),
      where("date", ">=", startStr),
      orderBy("date", "asc")
    );

    const snap = await getDocs(q);
    return snap.docs.map((doc) => {
      const d = doc.data();
      return { text: d.text, mood: d.mood ?? null, date: d.date };
    });
  };

  const generateRecap = async () => {
    setRecapLoading(true);
    setRecap(null);
    setError(null);

    try {
      const fetched = await fetchMemories();
      setMemories(fetched);

      if (fetched.length === 0) {
        setRecap("No memories found for this period. Start capturing moments in the Today tab!");
        return;
      }

      const summary = await generateRecapSummary(fetched, period);
      setRecap(summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRecapLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setChatLoading(true);

    let currentMemories = memories;
    if (currentMemories.length === 0) {
      currentMemories = await fetchMemories();
      setMemories(currentMemories);
    }

    if (currentMemories.length === 0) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "You don't have any memories for this period yet. Add some in the Today tab first!" },
      ]);
      setChatLoading(false);
      return;
    }

    try {
      const reply = await chatWithMemories(currentMemories, updatedMessages);
      setMessages([...updatedMessages, { role: "assistant", content: reply }]);
    } catch (e: any) {
      setMessages([
        ...updatedMessages,
        { role: "assistant", content: `Error: ${e.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    setMemories([]);
    setMessages([]);
    setRecap(null);
  }, [period]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Your Recaps</Text>
            <Text style={styles.subtitle}>
              Look back on your memories, summarized
            </Text>

            <View style={styles.periodRow}>
              <TouchableOpacity
                style={[styles.periodButton, period === "week" && styles.periodActive]}
                onPress={() => setPeriod("week")}
              >
                <Text style={[styles.periodText, period === "week" && styles.periodTextActive]}>
                  This Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodButton, period === "month" && styles.periodActive]}
                onPress={() => setPeriod("month")}
              >
                <Text style={[styles.periodText, period === "month" && styles.periodTextActive]}>
                  This Month
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.generateButton} onPress={generateRecap}>
              <Text style={styles.generateText}>Generate Recap</Text>
            </TouchableOpacity>

            {recapLoading && (
              <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 24 }} />
            )}

            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {recap && (
              <View style={styles.recapCard}>
                <Text style={styles.recapText}>{recap}</Text>
              </View>
            )}

            <View style={styles.chatDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Ask about your memories</Text>
              <View style={styles.dividerLine} />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                item.role === "user" && styles.userBubbleText,
              ]}
            >
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          chatLoading ? (
            <View style={styles.assistantBubble}>
              <ActivityIndicator size="small" color="#6C63FF" />
            </View>
          ) : null
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="What was my best day this week?"
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || chatLoading) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || chatLoading}
        >
          <Text style={styles.sendText}>Ask</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  listContent: { padding: 24, paddingBottom: 8 },
  heading: { fontSize: 26, fontWeight: "bold", color: "#1a1a1a" },
  subtitle: { fontSize: 14, color: "#888", marginTop: 4, marginBottom: 24 },
  periodRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
  },
  periodActive: { backgroundColor: "#6C63FF" },
  periodText: { fontSize: 14, fontWeight: "600", color: "#666" },
  periodTextActive: { color: "#fff" },
  generateButton: {
    backgroundColor: "#1a1a1a",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  generateText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  recapCard: {
    marginTop: 24,
    backgroundColor: "#f8f7ff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e8e5ff",
  },
  recapText: { fontSize: 15, lineHeight: 24, color: "#333" },
  errorCard: {
    marginTop: 24,
    backgroundColor: "#fff0f0",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ffdddd",
  },
  errorText: { fontSize: 14, color: "#cc0000" },
  chatDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e0e0e0" },
  dividerText: { paddingHorizontal: 12, fontSize: 13, color: "#888" },
  bubble: { maxWidth: "80%", padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { alignSelf: "flex-end", backgroundColor: "#6C63FF" },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: "#f0f0f0" },
  bubbleText: { fontSize: 15, lineHeight: 22, color: "#1a1a1a" },
  userBubbleText: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600" },
});
