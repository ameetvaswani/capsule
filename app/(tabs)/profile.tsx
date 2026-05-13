import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, Pressable } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, deleteDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

export default function Profile() {
  const { user } = useAuth();
  const [deleteScheduled, setDeleteScheduled] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "users", user.uid, "settings", "account")).then((snap) => {
      const data = snap.data();
      if (data?.deletionScheduledAt) {
        setDeleteScheduled(data.deletionScheduledAt);
      }
    });
  }, [user]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7);
      const scheduledStr = scheduledDate.toISOString();

      await setDoc(doc(db, "users", user.uid, "settings", "account"), {
        deletionScheduledAt: scheduledStr,
        frozen: true,
      });

      setDeleteScheduled(scheduledStr);
      setShowDeleteModal(false);
      Alert.alert(
        "Account scheduled for deletion",
        "Your account will be permanently deleted on " + scheduledDate.toLocaleDateString() + ". You can cancel this from your profile before then."
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!user || !feedback.trim()) return;
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        email: user.email,
        text: feedback.trim(),
        createdAt: serverTimestamp(),
      });
      setFeedback("");
      setShowFeedbackModal(false);
      Alert.alert("Thank you!", "Your feedback has been submitted.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "settings", "account"));
    setDeleteScheduled(null);
    Alert.alert("Deletion cancelled", "Your account has been restored.");
  };

  const daysRemaining = deleteScheduled
    ? Math.max(0, Math.ceil((new Date(deleteScheduled).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <View style={styles.container}>
      {deleteScheduled && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Account scheduled for deletion in {daysRemaining} {daysRemaining === 1 ? "day" : "days"}
          </Text>
          <TouchableOpacity style={styles.cancelDeleteButton} onPress={handleCancelDeletion}>
            <Text style={styles.cancelDeleteText}>Cancel Deletion</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.displayName || "Capsule User"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowFeedbackModal(true)}>
            <Text style={styles.menuItemText}>Send Feedback</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Text style={styles.menuItemText}>Sign Out</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowDeleteModal(true)}>
            <Text style={styles.menuItemTextDanger}>Delete Account</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={showFeedbackModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowFeedbackModal(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitleFeedback}>Send Feedback</Text>
            <Text style={styles.modalSubtext}>Suggestions, bugs, or just say hi</Text>
            <TextInput
              style={styles.feedbackInput}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="What's on your mind?"
              placeholderTextColor="#A0A0B0"
              multiline
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowFeedbackModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedbackSubmit, !feedback.trim() && styles.feedbackSubmitDisabled]}
                onPress={handleSubmitFeedback}
                disabled={!feedback.trim()}
              >
                <Text style={styles.feedbackSubmitText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalBody}>
              Your account and all your memories will be permanently deleted after 7 days.{"\n\n"}
              During this period, your account will be frozen and you can cancel the deletion from your profile.{"\n\n"}
              After 7 days, this action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDelete} onPress={handleDeleteAccount}>
                <Text style={styles.modalDeleteText}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Capsule v1.1.0</Text>
        <Text style={styles.footerSubtext}>Your memories, treasured</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFF", padding: 24, paddingTop: 40 },
  warningBanner: {
    backgroundColor: "#FFF3E0",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FFE0B2",
    alignItems: "center",
  },
  warningText: { fontSize: 14, fontWeight: "600", color: "#E65100", marginBottom: 10 },
  cancelDeleteButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E65100",
  },
  cancelDeleteText: { fontSize: 14, fontWeight: "600", color: "#E65100" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    shadowColor: "#6C63FF",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#6C63FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  avatarText: { color: "#fff", fontSize: 36, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "700", color: "#1a1a2e", marginBottom: 4 },
  email: { fontSize: 14, color: "#8E8EA0" },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#8E8EA0", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, marginLeft: 4 },
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  menuDivider: { height: 1, backgroundColor: "#F3F2FA", marginHorizontal: 18 },
  menuItemText: { fontSize: 16, color: "#1a1a2e", fontWeight: "600" },
  menuItemTextDanger: { fontSize: 16, color: "#E54D4D", fontWeight: "600" },
  menuItemArrow: { fontSize: 18, color: "#ccc" },
  footer: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 20 },
  footerText: { fontSize: 13, color: "#B0B0C0", fontWeight: "600" },
  footerSubtext: { fontSize: 12, color: "#D0D0E0", marginTop: 2 },
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
  },
  modalTitleFeedback: { fontSize: 20, fontWeight: "800", color: "#1a1a2e", marginBottom: 4 },
  modalSubtext: { fontSize: 14, color: "#8E8EA0", marginBottom: 16 },
  feedbackInput: {
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
  feedbackSubmit: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  feedbackSubmitDisabled: { opacity: 0.4 },
  feedbackSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#E54D4D", marginBottom: 16 },
  modalBody: { fontSize: 15, color: "#4A4A5A", lineHeight: 22 },
  modalButtons: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  modalCancel: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  modalCancelText: { fontSize: 15, color: "#8E8EA0", fontWeight: "600" },
  modalDelete: {
    backgroundColor: "#E54D4D",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  modalDeleteText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
