import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { router } from "expo-router";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { auth } from "../lib/firebase";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then(() => router.replace("/(tabs)/today"))
        .catch((e) => Alert.alert("Error", e.message));
    }
  }, [response]);

  const handleGoogleSignIn = () => {
    promptAsync();
  };

  const handleSubmit = async () => {
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/(tabs)/today");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/icon.png")}
          style={styles.logoImage}
        />
        <Text style={styles.brand}>Capsule</Text>
        <Text style={styles.tagline}>Your memories, treasured</Text>
      </View>

      <Text style={styles.title}>{isSignUp ? "Create your account" : "Welcome back"}</Text>

      <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#A0A0B0"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#A0A0B0"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>
          {isSignUp ? "Create Account" : "Sign In"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
        <Text style={styles.toggle}>
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 28,
    backgroundColor: "#FAFBFF",
  },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoImage: {
    width: 88,
    height: 88,
    borderRadius: 20,
    marginBottom: 16,
  },
  brand: {
    fontSize: 34,
    fontWeight: "800",
    color: "#6C63FF",
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 15, color: "#8E8EA0", marginTop: 4 },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#EDEDF5",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#1a1a2e" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#EDEDF5" },
  dividerText: { paddingHorizontal: 14, fontSize: 13, color: "#8E8EA0" },
  inputContainer: { gap: 14 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#EDEDF5",
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: "#1a1a2e",
  },
  button: {
    backgroundColor: "#6C63FF",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#6C63FF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  toggle: { textAlign: "center", color: "#6C63FF", marginTop: 20, fontSize: 14 },
});
