import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
const analytics = getAnalytics(app);
