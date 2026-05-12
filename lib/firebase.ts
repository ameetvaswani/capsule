import { initializeApp } from "firebase/app";
//@ts-ignore
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB-bYMpXUAMwu8gd--cWI_RcY6U21JvyO0",
  authDomain: "capsule-b76f0.firebaseapp.com",
  projectId: "capsule-b76f0",
  storageBucket: "capsule-b76f0.firebasestorage.app",
  messagingSenderId: "48065460251",
  appId: "1:48065460251:web:758b154e740c6e97e860be",
  measurementId: "G-WGEG8C43WC"
};

const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

export const db = getFirestore(app);
export const functions = getFunctions(app);
