// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDI1o6y7nRuH4V3HBo1Gfa8FC7Pw41I7nk",
  authDomain: "transferenciascaratininga.firebaseapp.com",
  projectId: "transferenciascaratininga",
  storageBucket: "transferenciascaratininga.firebasestorage.app",
  messagingSenderId: "466468008796",
  appId: "1:466468008796:web:f6a29a0357bb381ac60799",
  measurementId: "G-SY8YCJXBYG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
