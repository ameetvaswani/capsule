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
    Alert.alert("Saved", "Your memory has been captured ✨");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>
          {isToday(date) ? "What happened today?" : "A memory from the past"}
        </Text>
        <TouchableOpacity onPress={() => setShowDatePicker(!showDatePicker)}>
          <Text style={styles.date}>
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {"  "}
            <Text style={styles.changeDate}>Change date</Text>
          </Text>
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

        <TextInput
          style={styles.input}
          value={memory}
          onChangeText={setMemory}
          placeholder="A moment, a thought, a feeling..."
          multiline
          textAlignVertical="top"
        />

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
              <Text style={styles.moodTooltip}>{m.label}</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24, paddingTop: 16 },
  heading: { fontSize: 26, fontWeight: "bold", color: "#1a1a1a" },
  date: { fontSize: 14, color: "#888", marginTop: 4, marginBottom: 24 },
  changeDate: { color: "#6C63FF", fontWeight: "600" },
  calendarOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  calendarPopup: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    width: 300,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 160,
    lineHeight: 24,
  },
  moodLabel: { fontSize: 16, fontWeight: "600", marginTop: 24, marginBottom: 12 },
  moodRow: { flexDirection: "row", gap: 12 },
  moodItem: { alignItems: "center" },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  moodSelected: { backgroundColor: "#e8e5ff", borderWidth: 2, borderColor: "#6C63FF" },
  moodEmoji: { fontSize: 24 },
  moodTooltip: { fontSize: 11, color: "#888", marginTop: 4 },
  saveButton: {
    backgroundColor: "#6C63FF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 32,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
