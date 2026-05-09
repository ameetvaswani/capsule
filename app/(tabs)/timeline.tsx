import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
  doc,
  updateDoc,
  deleteDoc,
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
  const [editing, setEditing] = useState<Memory | null>(null);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState<Memory | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "memories"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(q, (snap) => {
      setMemories(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Memory))
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
          data={memories}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.dateBadge}>
                  <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
                </View>
                {item.mood && <Text style={styles.cardMood}>{item.mood}</Text>}
              </View>
              <Text style={styles.cardText}>{item.text}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
                  <Text style={styles.editAction}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setDeleting(item)}>
                  <Text style={styles.deleteAction}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  dateBadge: {
    backgroundColor: "#F3F2FA",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardDate: { fontSize: 12, color: "#6C63FF", fontWeight: "600" },
  cardMood: { fontSize: 20 },
  cardText: { fontSize: 15, lineHeight: 23, color: "#2D2D3A" },
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F3F2FA",
  },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  editAction: { fontSize: 13, color: "#6C63FF", fontWeight: "700" },
  deleteAction: { fontSize: 13, color: "#E54D4D", fontWeight: "700" },
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
