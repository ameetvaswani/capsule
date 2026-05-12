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
  Switch,
  Modal,
  Pressable,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { Calendar } from "react-native-calendars";
import * as LocalAuthentication from "expo-local-authentication";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";
import {
  generateRecapSummary,
  chatWithMemories,
  type Memory,
  type ChatMessage,
} from "../../lib/ai";

type RecapPeriod = "week" | "month" | "year" | "all" | "custom";
type CategoryFilter = "All" | "Personal" | "Professional";

export default function Recaps() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<RecapPeriod>("week");
  const [recap, setRecap] = useState<string | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [includePrivate, setIncludePrivate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");
  const [customStart, setCustomStart] = useState<string | null>(null);
  const [customEnd, setCustomEnd] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleIncludePrivateToggle = async (value: boolean) => {
    if (!value) {
      setIncludePrivate(false);
      return;
    }

    if (Platform.OS === "web") {
      setIncludePrivate(true);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setIncludePrivate(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to include private memories",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      setIncludePrivate(true);
    } else {
      Alert.alert("Authentication required", "Face ID is needed to include private memories.");
    }
  };

  const fetchMemories = async () => {
    if (!user) return [];

    let q;
    if (period === "all") {
      q = query(
        collection(db, "users", user.uid, "memories"),
        orderBy("date", "asc")
      );
    } else if (period === "year") {
      const now = new Date();
      const startDate = new Date();
      startDate.setFullYear(now.getFullYear() - 1);
      const startStr = startDate.toISOString().split("T")[0];

      q = query(
        collection(db, "users", user.uid, "memories"),
        where("date", ">=", startStr),
        orderBy("date", "asc")
      );
    } else if (period === "custom") {
      if (!customStart || !customEnd) return [];
      q = query(
        collection(db, "users", user.uid, "memories"),
        where("date", ">=", customStart),
        where("date", "<=", customEnd),
        orderBy("date", "asc")
      );
    } else {
      const now = new Date();
      const startDate = new Date();
      if (period === "week") {
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate.setMonth(now.getMonth() - 1);
      }

      const startStr = startDate.toISOString().split("T")[0];

      q = query(
        collection(db, "users", user.uid, "memories"),
        where("date", ">=", startStr),
        orderBy("date", "asc")
      );
    }

    const snap = await getDocs(q);
    return snap.docs
      .map((doc) => {
        const d = doc.data();
        return { text: d.text, mood: d.mood ?? null, date: d.date, isPrivate: !!d.isPrivate, category: d.category ?? null };
      })
      .filter((m) => includePrivate || !m.isPrivate)
      .filter((m) => categoryFilter === "All" || m.category === categoryFilter)
      .map(({ text, mood, date }) => ({ text, mood, date }));
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
  }, [period, includePrivate, categoryFilter]);

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
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.heading}>Your Recaps</Text>
            <Text style={styles.subtitle}>
              Look back on your memories, summarized
            </Text>

            <View style={styles.privateToggleRow}>
              <Text style={styles.privateToggleLabel}>Include private memories</Text>
              <Switch
                value={includePrivate}
                onValueChange={handleIncludePrivateToggle}
                trackColor={{ true: "#6C63FF", false: "#E0E0E0" }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.filterSection}>
              <TouchableOpacity
                style={[
                  styles.categoryButton,
                  categoryFilter === "All" && styles.categoryButtonAll,
                  categoryFilter === "Personal" && styles.categoryButtonPersonal,
                  categoryFilter === "Professional" && styles.categoryButtonPro,
                ]}
                onPress={() => {
                  const next = categoryFilter === "All" ? "Personal" : categoryFilter === "Personal" ? "Professional" : "All";
                  setCategoryFilter(next);
                }}
              >
                <Text style={[
                  styles.categoryButtonText,
                  categoryFilter === "All" && styles.categoryButtonTextAll,
                  categoryFilter === "Personal" && styles.categoryButtonTextPersonal,
                  categoryFilter === "Professional" && styles.categoryButtonTextPro,
                ]}>
                  {categoryFilter === "All" ? "📋 Personal and Professional" : categoryFilter === "Personal" ? "🏠 Personal" : "💼 Professional"}
                </Text>
                <Text style={[
                  styles.categoryButtonArrow,
                  categoryFilter === "All" && styles.categoryButtonTextAll,
                  categoryFilter === "Personal" && styles.categoryButtonTextPersonal,
                  categoryFilter === "Professional" && styles.categoryButtonTextPro,
                ]}>⇄</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <TouchableOpacity
                style={[styles.categoryButton, styles.categoryButtonAll]}
                onPress={() => {
                  const next = period === "week" ? "month" : period === "month" ? "year" : period === "year" ? "all" : period === "all" ? "custom" : "week";
                  setPeriod(next);
                }}
              >
                <Text style={[styles.categoryButtonText, styles.categoryButtonTextAll]}>
                  {period === "week" ? "📅 This Week" : period === "month" ? "📅 This Month" : period === "year" ? "📅 This Year" : period === "all" ? "📅 All Time" : "📅 Custom Time Range"}
                </Text>
                <Text style={[styles.categoryButtonArrow, styles.categoryButtonTextAll]}>⇄</Text>
              </TouchableOpacity>
            </View>

            {period === "custom" && (
              <View style={styles.customDateRow}>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowStartPicker(true)}>
                  <Text style={styles.datePickerButtonText}>{customStart || "Start date"}</Text>
                </TouchableOpacity>
                <Text style={styles.dateSeparator}>to</Text>
                <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowEndPicker(true)}>
                  <Text style={styles.datePickerButtonText}>{customEnd || "End date"}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Modal visible={showStartPicker} transparent animationType="fade">
              <Pressable style={styles.calendarOverlay} onPress={() => setShowStartPicker(false)}>
                <Pressable style={styles.calendarPopup}>
                  <Calendar
                    maxDate={customEnd || new Date().toISOString().split("T")[0]}
                    markedDates={customStart ? { [customStart]: { selected: true, selectedColor: "#6C63FF" } } : {}}
                    onDayPress={(day: { dateString: string }) => {
                      setCustomStart(day.dateString);
                      setShowStartPicker(false);
                    }}
                    theme={{ todayTextColor: "#6C63FF", arrowColor: "#6C63FF" }}
                  />
                </Pressable>
              </Pressable>
            </Modal>

            <Modal visible={showEndPicker} transparent animationType="fade">
              <Pressable style={styles.calendarOverlay} onPress={() => setShowEndPicker(false)}>
                <Pressable style={styles.calendarPopup}>
                  <Calendar
                    minDate={customStart || undefined}
                    maxDate={new Date().toISOString().split("T")[0]}
                    markedDates={customEnd ? { [customEnd]: { selected: true, selectedColor: "#6C63FF" } } : {}}
                    onDayPress={(day: { dateString: string }) => {
                      setCustomEnd(day.dateString);
                      setShowEndPicker(false);
                    }}
                    theme={{ todayTextColor: "#6C63FF", arrowColor: "#6C63FF" }}
                  />
                </Pressable>
              </Pressable>
            </Modal>

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
            <View style={[styles.bubble, styles.assistantBubble]}>
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
          placeholderTextColor="#A0A0B0"
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
  container: { flex: 1, backgroundColor: "#FAFBFF" },
  listContent: { padding: 24, paddingBottom: 8 },
  privateToggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  privateToggleLabel: { fontSize: 14, fontWeight: "600", color: "#8E8EA0" },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F0F0F5",
    marginBottom: 20,
  },
  categoryButtonAll: { backgroundColor: "#F0F0F5" },
  categoryButtonPersonal: { backgroundColor: "#F3F0FF" },
  categoryButtonPro: { backgroundColor: "#EEFBF3" },
  categoryButtonText: { fontSize: 13, fontWeight: "700", color: "#8E8EA0" },
  categoryButtonTextAll: { color: "#1a1a2e" },
  categoryButtonTextPersonal: { color: "#6C63FF" },
  categoryButtonTextPro: { color: "#2E8B57" },
  categoryButtonArrow: { fontSize: 11 },
  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: "#F3F2FA",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  datePickerButtonText: { fontSize: 14, fontWeight: "600", color: "#6C63FF" },
  dateSeparator: { fontSize: 14, color: "#8E8EA0" },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,30,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  calendarPopup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    width: 310,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a2e",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: "#8E8EA0", marginTop: 4, marginBottom: 24 },
  filterSection: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  generateButton: {
    backgroundColor: "#1a1a2e",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  generateText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  recapCard: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#6C63FF",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  recapText: { fontSize: 15, lineHeight: 24, color: "#2D2D3A" },
  errorCard: {
    marginTop: 24,
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E54D4D",
  },
  errorText: { fontSize: 14, color: "#E54D4D" },
  chatDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 36,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EDEDF5" },
  dividerText: { paddingHorizontal: 14, fontSize: 12, color: "#8E8EA0", fontWeight: "600" },
  bubble: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#6C63FF",
    borderBottomRightRadius: 4,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bubbleText: { fontSize: 15, lineHeight: 22, color: "#2D2D3A" },
  userBubbleText: { color: "#fff" },
  inputRow: {
    flexDirection: "row",
    padding: 14,
    paddingBottom: 28,
    backgroundColor: "#fff",
    borderTopWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -4 },
    elevation: 4,
  },
  input: {
    flex: 1,
    backgroundColor: "#F8F8FC",
    borderWidth: 1.5,
    borderColor: "#EDEDF5",
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1a1a2e",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#6C63FF",
    paddingHorizontal: 22,
    borderRadius: 24,
    justifyContent: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
