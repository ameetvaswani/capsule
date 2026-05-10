import { View, Text, Image, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isWideScreen = Platform.OS === "web" && width >= 768;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#6C63FF",
        tabBarInactiveTintColor: "#8E8EA0",
        ...(isWideScreen
          ? {
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
            }
          : {
              tabBarStyle: {
                backgroundColor: "#fff",
                borderTopWidth: 0,
                elevation: 12,
                shadowColor: "#000",
                shadowOpacity: 0.08,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: -4 },
                height: 88,
                paddingBottom: 24,
                paddingTop: 12,
              },
              tabBarLabelStyle: {
                fontSize: 11,
                fontWeight: "600",
              },
            }),
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
  );
}

const styles = StyleSheet.create({
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
});
