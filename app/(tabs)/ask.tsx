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
import { chatWithMemories, type Memory, type ChatMessage } from "../../lib/ai";

type RecapPeriod = "week" | "month" | "year" | "all" | "custom";
type CategoryFilter = "All" | "Personal" | "Professional";

export default function Ask() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<RecapPeriod>("all");
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
    } else if (period === "custom") {
      if (!customStart || !customEnd) return [];
      q = query(
        collection(db, "users", user.uid, "memories"),
        where("date", ">=", customStart),
        where("date", "<=", customEnd),
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
            <Text style={styles.heading}>Ask Your Memories</Text>
            <Text style={styles.subtitle}>
              Chat with your past self — ask anything
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

            <View style={styles.segmentRow}>
              {(["All", "Personal", "Professional"] as CategoryFilter[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.segmentButton, categoryFilter === cat && styles.segmentButtonActive]}
                  onPress={() => setCategoryFilter(cat)}
                >
                  <Text style={[styles.segmentText, categoryFilter === cat && styles.segmentTextActive]}>
                    {cat === "All" ? "All" : cat === "Personal" ? "Personal" : "Work"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.segmentRow}>
              {(["week", "month", "year", "all", "custom"] as RecapPeriod[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.segmentButton, period === p && styles.segmentButtonActive]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.segmentText, period === p && styles.segmentTextActive]}>
                    {p === "week" ? "Week" : p === "month" ? "Month" : p === "year" ? "Year" : p === "all" ? "All" : "Custom"}
                  </Text>
                </TouchableOpacity>
              ))}
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
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a2e",
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: 14, color: "#8E8EA0", marginTop: 4, marginBottom: 24 },
  privateToggleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  privateToggleLabel: { fontSize: 14, fontWeight: "600", color: "#8E8EA0" },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#F0F0F5",
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8EA0",
  },
  segmentTextActive: {
    color: "#6C63FF",
    fontWeight: "700",
  },
  customDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
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
