import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

type Memory = {
  id: string;
  text: string;
  mood: string | null;
  date: string;
  createdAt: any;
};

export default function Timeline() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "memories"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      setMemories(
        snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Memory))
      );
    });
  }, [user]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      {memories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No memories yet</Text>
          <Text style={styles.emptySubtext}>
            Start capturing moments in the Today tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={memories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                {item.mood && <Text style={styles.cardMood}>{item.mood}</Text>}
              </View>
              <Text style={styles.cardText}>{item.text}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, fontWeight: "600", color: "#333" },
  emptySubtext: { fontSize: 14, color: "#888", marginTop: 8 },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  cardDate: { fontSize: 13, color: "#888", fontWeight: "500" },
  cardMood: { fontSize: 18 },
  cardText: { fontSize: 15, lineHeight: 22, color: "#1a1a1a" },
});
