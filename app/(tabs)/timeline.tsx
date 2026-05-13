import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  doc,
  updateDoc,
  deleteDoc,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import * as LocalAuthentication from "expo-local-authentication";
import { db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

type Memory = {
  id: string;
  text: string;
  mood: string | null;
  category: string | null;
  isPrivate: boolean;
  date: string;
  createdAt: any;
};

const PAGE_SIZE = 10;

export default function Timeline() {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const [showPrivate, setShowPrivate] = useState(false);

  const updateCategory = async (memoryId: string, category: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "memories", memoryId), { category });
  };

  const togglePrivate = async (memoryId: string, current: boolean) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid, "memories", memoryId), { isPrivate: !current });
  };

  const handleShowPrivateToggle = async (value: boolean) => {
    if (!value) {
      setShowPrivate(false);
      return;
    }

    if (Platform.OS === "web") {
      setShowPrivate(true);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setShowPrivate(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to view private memories",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      setShowPrivate(true);
    } else {
      Alert.alert("Authentication required", "Face ID is needed to view private memories.");
    }
  };

  const filteredMemories = showPrivate
    ? memories
    : memories.filter((m) => !m.isPrivate);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "memories"),
      orderBy("date", "desc"),
      limit(PAGE_SIZE)
    );

    return onSnapshot(q, (snap) => {
      setMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
      );
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    });
  }, [user]);

  const loadMore = async () => {
    if (!user || !lastDoc || !hasMore || loadingMore) return;
    setLoadingMore(true);

    const q = query(
      collection(db, "users", user.uid, "memories"),
      orderBy("date", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );

    const snap = await (await import("firebase/firestore")).getDocs(q);
    const newMemories = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory));
    setMemories((prev) => [...prev, ...newMemories]);
    setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleEdit = (memory: Memory) => {
    setEditing(memory);
    setEditText(memory.text);
  };

  const saveEdit = async () => {
    if (!editing || !user || !editText.trim()) return;
    await updateDoc(doc(db, "users", user.uid, "memories", editing.id), {
      text: editText.trim(),
    });
    setEditing(null);
  };

  const confirmDelete = async () => {
    if (!deleting || !user) return;
    await deleteDoc(doc(db, "users", user.uid, "memories", deleting.id));
    setDeleting(null);
  };

  return (
    <View style={styles.container}>
      {memories.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={{ fontSize: 40 }}>📖</Text>
          </View>
          <Text style={styles.emptyText}>No memories yet</Text>
          <Text style={styles.emptySubtext}>
            Start capturing moments in the Today tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMemories}
          ListHeaderComponent={
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show private memories</Text>
              <Switch
                value={showPrivate}
                onValueChange={handleShowPrivateToggle}
                trackColor={{ true: "#6C63FF", false: "#E0E0E0" }}
                thumbColor="#fff"
              />
            </View>
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator size="small" color="#6C63FF" style={{ marginVertical: 16 }} />
            ) : null
          }
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <View style={styles.swipeActions}>
                  <TouchableOpacity style={styles.swipeButtonEdit} onPress={() => handleEdit(item)}>
                    <Text style={styles.swipeIcon}>✏️</Text>
                    <Text style={styles.swipeButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.swipeButtonPrivate} onPress={() => togglePrivate(item.id, !!item.isPrivate)}>
                    <Text style={styles.swipeIcon}>{item.isPrivate ? "👁️" : "🔒"}</Text>
                    <Text style={styles.swipeButtonText}>{item.isPrivate ? "Public" : "Private"}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.swipeButtonDelete} onPress={() => setDeleting(item)}>
                    <Text style={styles.swipeIcon}>🗑️</Text>
                    <Text style={styles.swipeButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
              overshootRight={false}
            >
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.dateBadge}>
                    <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.categoryButton,
                      (item.category || "Personal") === "Professional" ? styles.categoryButtonPro : styles.categoryButtonPersonal,
                    ]}
                    onPress={() => updateCategory(item.id, (item.category || "Personal") === "Personal" ? "Professional" : "Personal")}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      (item.category || "Personal") === "Professional" ? styles.categoryButtonTextPro : styles.categoryButtonTextPersonal,
                    ]}>
                      {(item.category || "Personal") === "Professional" ? "💼 Professional" : "🏠 Personal"}
                    </Text>
                    <Text style={[
                      styles.categoryButtonArrow,
                      (item.category || "Personal") === "Professional" ? styles.categoryButtonTextPro : styles.categoryButtonTextPersonal,
                    ]}>⇄</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardTextRow}>
                  <Text style={styles.cardText}>{item.text}</Text>
                  {item.mood && <Text style={styles.cardMood}>{item.mood}</Text>}
                </View>
              </View>
            </Swipeable>
          )}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setEditing(null)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Memory</Text>
            <TextInput
              style={styles.modalInput}
              value={editText}
              onChangeText={setEditText}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditing(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!deleting} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDeleting(null)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Memory</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete this memory? This can't be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setDeleting(null)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFF" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  emptyIcon: { marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: "700", color: "#1a1a2e" },
  emptySubtext: { fontSize: 15, color: "#8E8EA0", marginTop: 8, textAlign: "center" },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: "#8E8EA0" },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  categoryButtonPersonal: {
    backgroundColor: "#F3F0FF",
  },
  categoryButtonPro: {
    backgroundColor: "#EEFBF3",
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  categoryButtonTextPersonal: { color: "#6C63FF" },
  categoryButtonTextPro: { color: "#2E8B57" },
  categoryButtonArrow: {
    fontSize: 11,
  },
  dateBadge: {
    backgroundColor: "#F3F2FA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardDate: { fontSize: 12, color: "#6C63FF", fontWeight: "600" },
  cardTextRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardText: { flex: 1, fontSize: 15, lineHeight: 23, color: "#2D2D3A" },
  cardMood: { fontSize: 20, marginTop: 2 },
  swipeActions: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
    marginLeft: 8,
    gap: 4,
  },
  swipeButtonEdit: {
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
  },
  swipeButtonPrivate: {
    backgroundColor: "#F5A623",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
  },
  swipeButtonDelete: {
    backgroundColor: "#E54D4D",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 12,
  },
  swipeIcon: { fontSize: 20, marginBottom: 4 },
  swipeButtonText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,30,0.5)",
    justifyContent: "center",
    padding: 28,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1a1a2e", marginBottom: 16 },
  modalInput: {
    backgroundColor: "#F8F8FC",
    borderWidth: 1.5,
    borderColor: "#EDEDF5",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 22,
    color: "#1a1a2e",
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  cancelText: { fontSize: 15, color: "#8E8EA0", fontWeight: "600" },
  saveButton: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  deleteConfirmText: { fontSize: 15, color: "#4A4A5A", lineHeight: 22 },
  deleteButton: {
    backgroundColor: "#E54D4D",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: "#E54D4D",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  deleteButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
