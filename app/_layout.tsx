import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from "react-native";
import { Slot } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { AuthProvider, useAuth } from "../lib/auth-context";
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

function BiometricGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setUnlocked(true);
      } else {
        checkBiometrics();
      }
    }
  }, [user, loading]);

  const checkBiometrics = async () => {
    if (Platform.OS === "web") {
      setUnlocked(true);
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      setUnlocked(true);
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Unlock Capsule",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      setUnlocked(true);
    } else {
      setFailed(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.lockText}>Capsule is locked</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => { setFailed(false); checkBiometrics(); }}
        >
          <Text style={styles.retryText}>Unlock with Face ID</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!unlocked) {
    return (
      <View style={styles.gateContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("[Capsule] Uncaught error:", err.message, err.stack);
    }}>
      <AuthProvider>
        <BiometricGate>
          <Slot />
        </BiometricGate>
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
  gateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAFBFF",
  },
  lockText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a2e",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#6C63FF",
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  retryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
