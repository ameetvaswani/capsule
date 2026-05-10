import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type TabItem = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const tabs: TabItem[] = [
  { name: "today", title: "Today", icon: "add-circle-outline" },
  { name: "timeline", title: "Timeline", icon: "time-outline" },
  { name: "recaps", title: "Recaps", icon: "sparkles-outline" },
  { name: "profile", title: "Profile", icon: "person-outline" },
];

function Sidebar() {
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarBrand}>Capsule</Text>
      </View>
      <View style={styles.sidebarNav}>
        {tabs.map((tab) => {
          const isActive = pathname.includes(tab.name);
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              // Tabs handles navigation internally; this is visual only
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? "#6C63FF" : "#8E8EA0"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#6C63FF",
          tabBarInactiveTintColor: "#8E8EA0",
          tabBarPosition: "left",
          tabBarVariant: "material",
          tabBarStyle: {
            backgroundColor: "#fff",
            borderRightWidth: 1,
            borderRightColor: "#F0F0F5",
            width: 200,
            paddingTop: 24,
            paddingHorizontal: 12,
          },
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: "600",
          },
          tabBarIconStyle: {
            marginRight: 4,
          },
          headerStyle: {
            backgroundColor: "#FAFBFF",
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          headerTitleStyle: {
            fontWeight: "700",
            fontSize: 18,
            color: "#1a1a2e",
          },
          headerLeft: () => (
            <View style={styles.headerBrand}>
              <Image
                source={require("../../assets/icon.png")}
                style={styles.headerLogo}
              />
              <Text style={styles.headerBrandText}>Capsule</Text>
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="today"
          options={{
            title: "Today",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="add-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: "Timeline",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="recaps"
          options={{
            title: "Recaps",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sparkles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  headerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 12,
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6C63FF",
    letterSpacing: -0.5,
  },
  sidebar: {
    width: 200,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#F0F0F5",
    paddingTop: 60,
    paddingHorizontal: 12,
  },
  sidebarHeader: { paddingHorizontal: 12, marginBottom: 32 },
  sidebarBrand: { fontSize: 22, fontWeight: "800", color: "#6C63FF" },
  sidebarNav: { gap: 4 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  navItemActive: { backgroundColor: "#F3F2FA" },
  navLabel: { fontSize: 15, color: "#8E8EA0", fontWeight: "500" },
  navLabelActive: { color: "#6C63FF", fontWeight: "700" },
});
