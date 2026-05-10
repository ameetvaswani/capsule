import { useEffect } from "react";
import { View, Text, StyleSheet, LogBox } from "react-native";
import { Slot } from "expo-router";
import { AuthProvider } from "../lib/auth-context";
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({ error }: { error: unknown }) {
  const err = error instanceof Error ? error : new Error(String(error));
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{err.message}</Text>
      <Text style={styles.errorStack}>{err.stack?.slice(0, 500)}</Text>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    console.log("[Capsule] App started");
  }, []);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[Capsule] Uncaught error:", err.message, err.stack);
    }}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFF5F5",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#E54D4D",
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 15,
    color: "#333",
    marginBottom: 16,
  },
  errorStack: {
    fontSize: 12,
    color: "#666",
    fontFamily: "monospace",
  },
});
