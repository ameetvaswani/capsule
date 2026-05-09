import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";

export default function Profile() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Text style={styles.menuItemText}>Sign Out</Text>
            <Text style={styles.menuItemArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Capsule v1.0.0</Text>
        <Text style={styles.footerSubtext}>Your memories, treasured</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFBFF", padding: 24, paddingTop: 40 },
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
  menuItemText: { fontSize: 16, color: "#E54D4D", fontWeight: "600" },
  menuItemArrow: { fontSize: 18, color: "#ccc" },
  footer: { flex: 1, justifyContent: "flex-end", alignItems: "center", paddingBottom: 20 },
  footerText: { fontSize: 13, color: "#B0B0C0", fontWeight: "600" },
  footerSubtext: { fontSize: 12, color: "#D0D0E0", marginTop: 2 },
});
