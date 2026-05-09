import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
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
import { generateRecapSummary } from "../../lib/ai";

type RecapPeriod = "week" | "month";

export default function Recaps() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<RecapPeriod>("week");
  const [recap, setRecap] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateRecap = async () => {
    if (!user) return;
    setLoading(true);
    setRecap(null);

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
    const memories = snap.docs.map((doc) => doc.data());

    if (memories.length === 0) {
      setRecap("No memories found for this period. Start capturing moments in the Today tab!");
      setLoading(false);
      return;
    }

    try {
      const summary = await generateRecapSummary(
        memories.map((m) => ({ text: m.text, mood: m.mood ?? null, date: m.date })),
        period
      );
      setRecap(summary);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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

      {loading && (
        <ActivityIndicator size="large" color="#6C63FF" style={{ marginTop: 32 }} />
      )}

      {recap && (
        <View style={styles.recapCard}>
          <Text style={styles.recapText}>{recap}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24 },
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
});
