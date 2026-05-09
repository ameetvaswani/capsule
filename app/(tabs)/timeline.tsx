import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
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
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleEdit(item)}>
                  <Text style={styles.editAction}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleting(item)}>
                  <Text style={styles.deleteAction}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!editing} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleting} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
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
          </View>
        </View>
      </Modal>
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
  cardActions: { flexDirection: "row", gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f0f0f0" },
  editAction: { fontSize: 14, color: "#6C63FF", fontWeight: "600" },
  deleteAction: { fontSize: 14, color: "#ff3b30", fontWeight: "600" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 120,
    lineHeight: 22,
  },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelText: { fontSize: 16, color: "#666" },
  saveButton: { backgroundColor: "#6C63FF", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  deleteConfirmText: { fontSize: 15, color: "#333", lineHeight: 22 },
  deleteButton: { backgroundColor: "#ff3b30", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  deleteButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
