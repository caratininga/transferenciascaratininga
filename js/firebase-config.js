import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDI1o6y7nRuH4V3HBo1Gfa8FC7Pw41I7nk",
  authDomain: "transferenciascaratininga.firebaseapp.com",
  projectId: "transferenciascaratininga",
  storageBucket: "transferenciascaratininga.firebasestorage.app",
  messagingSenderId: "466468008796",
  appId: "1:466468008796:web:f6a29a0357bb381ac60799",
  measurementId: "G-SY8YCJXBYG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
