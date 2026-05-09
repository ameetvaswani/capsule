import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

function isToday(d: Date) {
  const now = new Date();
  return d.toISOString().split("T")[0] === now.toISOString().split("T")[0];
}

export default function Today() {
  const { user } = useAuth();
  const [memory, setMemory] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const moodOptions = [
    { emoji: "😊", label: "Happy" },
    { emoji: "😌", label: "Calm" },
    { emoji: "😢", label: "Sad" },
    { emoji: "😤", label: "Frustrated" },
    { emoji: "🤩", label: "Excited" },
    { emoji: "😴", label: "Tired" },
  ];

  const toggleMood = (emoji: string) => {
    setMoods((prev) =>
      prev.includes(emoji) ? prev.filter((m) => m !== emoji) : [...prev, emoji]
    );
  };

  const saveMemory = async () => {
    if (!memory.trim() || !user) return;

    await addDoc(collection(db, "users", user.uid, "memories"), {
      text: memory.trim(),
      mood: moods.length > 0 ? moods.join(" ") : null,
      createdAt: serverTimestamp(),
      date: date.toISOString().split("T")[0],
    });

    setMemory("");
    setMoods([]);
    setDate(new Date());
    setShowDatePicker(false);
    Alert.alert("Saved", "Your memory has been captured");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>
          {isToday(date) ? "What happened today?" : "A memory from the past"}
        </Text>
        <TouchableOpacity
          style={styles.dateChip}
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Text style={styles.dateText}>
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>
          <Text style={styles.dateChangeIcon}>📅</Text>
        </TouchableOpacity>

        <Modal visible={showDatePicker} transparent animationType="fade">
          <Pressable style={styles.calendarOverlay} onPress={() => setShowDatePicker(false)}>
            <Pressable style={styles.calendarPopup}>
              <Calendar
                current={date.toISOString().split("T")[0]}
                maxDate={new Date().toISOString().split("T")[0]}
                markedDates={{
                  [date.toISOString().split("T")[0]]: { selected: true, selectedColor: "#6C63FF" },
                }}
                onDayPress={(day: { dateString: string }) => {
                  setDate(new Date(day.dateString + "T00:00:00"));
                  setShowDatePicker(false);
                }}
                theme={{
                  todayTextColor: "#6C63FF",
                  arrowColor: "#6C63FF",
                  textDayFontSize: 14,
                  textMonthFontSize: 15,
                  textDayHeaderFontSize: 12,
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={memory}
            onChangeText={setMemory}
            placeholder="A moment, a thought, a feeling..."
            placeholderTextColor="#B0B0C0"
            multiline
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.moodLabel}>How are you feeling?</Text>
        <View style={styles.moodRow}>
          {moodOptions.map((m) => (
            <View key={m.emoji} style={styles.moodItem}>
              <TouchableOpacity
                style={[styles.moodButton, moods.includes(m.emoji) && styles.moodSelected]}
                onPress={() => toggleMood(m.emoji)}
              >
                <Text style={styles.moodEmoji}>{m.emoji}</Text>
              </TouchableOpacity>
              <Text style={[styles.moodTooltip, moods.includes(m.emoji) && styles.moodTooltipActive]}>
                {m.label}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !memory.trim() && styles.saveDisabled]}
          onPress={saveMemory}
          disabled={!memory.trim()}
        >
          <Text style={styles.saveText}>Save Memory</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFF" },
  content: { padding: 24, paddingTop: 20, paddingBottom: 40 },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1a1a2e",
    letterSpacing: -0.5,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EDE9FF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 24,
    gap: 8,
  },
  dateText: { fontSize: 13, color: "#6C63FF", fontWeight: "600" },
  dateChangeIcon: { fontSize: 14 },
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
  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 4,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 150,
    lineHeight: 24,
    color: "#1a1a2e",
  },
  moodLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1a1a2e",
    marginTop: 28,
    marginBottom: 14,
  },
  moodRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  moodItem: { alignItems: "center" },
  moodButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F2FA",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  moodSelected: {
    backgroundColor: "#EDE9FF",
    borderColor: "#6C63FF",
    transform: [{ scale: 1.1 }],
  },
  moodEmoji: { fontSize: 24 },
  moodTooltip: { fontSize: 10, color: "#999", marginTop: 5, fontWeight: "500" },
  moodTooltipActive: { color: "#6C63FF", fontWeight: "700" },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 36,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
