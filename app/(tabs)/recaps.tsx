import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Switch,
  Modal,
  Pressable,
  Alert,
  Share,
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
  type Memory,
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
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    setMemories([]);
    setRecap(null);
  }, [period, includePrivate, categoryFilter]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => Share.share({ message: `${recap}\n\n— Shared from Capsule\nhttps://apps.apple.com/app/capsule-daily-memories/id6768098034` })}
          >
            <Text style={styles.shareButtonText}>Share Recap</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFF" },
  listContent: { padding: 24, paddingBottom: 8 },
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
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#F3F2FA",
  },
  shareButtonText: { fontSize: 13, fontWeight: "700", color: "#6C63FF" },
  errorCard: {
    marginTop: 24,
    backgroundColor: "#FFF5F5",
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#E54D4D",
  },
  errorText: { fontSize: 14, color: "#E54D4D" },
});
