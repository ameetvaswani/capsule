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
} from "react-native";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

export default function Today() {
  const { user } = useAuth();
  const [memory, setMemory] = useState("");
  const [mood, setMood] = useState<string | null>(null);

  const moods = ["😊", "😌", "😢", "😤", "🤩", "😴"];

  const saveMemory = async () => {
    if (!memory.trim() || !user) return;

    await addDoc(collection(db, "users", user.uid, "memories"), {
      text: memory.trim(),
      mood,
      createdAt: serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
    });

    setMemory("");
    setMood(null);
    Alert.alert("Saved", "Your memory has been captured ✨");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>What happened today?</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>

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
          {moods.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.moodButton, mood === m && styles.moodSelected]}
              onPress={() => setMood(mood === m ? null : m)}
            >
              <Text style={styles.moodEmoji}>{m}</Text>
            </TouchableOpacity>
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
